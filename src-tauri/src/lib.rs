use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::thread;
use std::path::PathBuf;
use std::fs::OpenOptions;
use std::io::Write;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

struct ServerState(Mutex<Option<Child>>);

fn log(msg: &str) {
    let data_dir = get_data_dir();
    let log_path = data_dir.join("debug.log");
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(f, "{}", msg);
    }
    println!("{}", msg);
}

fn get_data_dir() -> PathBuf {
    let base = if let Some(dir) = std::env::var_os("LOCALAPPDATA") {
        PathBuf::from(dir)
    } else if let Some(dir) = std::env::var_os("APPDATA") {
        PathBuf::from(dir)
    } else if let Some(dir) = std::env::var_os("HOME") {
        PathBuf::from(dir).join(".local").join("share")
    } else {
        PathBuf::from(".")
    };
    let data_dir = base.join("Cinematheque");
    let _ = std::fs::create_dir_all(&data_dir);
    let _ = std::fs::create_dir_all(data_dir.join("db"));
    data_dir
}

fn find_server() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?.to_path_buf();
    log(&format!("Exe dir: {:?}", exe_dir));

    // List contents of exe_dir
    if let Ok(entries) = std::fs::read_dir(&exe_dir) {
        log("Exe dir contents:");
        for entry in entries.flatten() {
            log(&format!("  {}", entry.path().display()));
        }
    }

    // Check resources dir
    let resources_dir = exe_dir.join("resources");
    if resources_dir.exists() {
        log("Resources dir contents:");
        if let Ok(entries) = std::fs::read_dir(&resources_dir) {
            for entry in entries.flatten() {
                log(&format!("  {}", entry.path().display()));
            }
        }
        // Check resources/standalone
        let standalone = resources_dir.join("standalone");
        if standalone.join("server.js").exists() {
            log(&format!("Found at: {:?}", standalone));
            return Some(standalone);
        }
    }

    None
}

fn wait_for_server(timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if std::net::TcpStream::connect("127.0.0.1:3000").is_ok() { return true; }
        thread::sleep(Duration::from_millis(500));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let is_dev = cfg!(debug_assertions);
    let server_child: Option<Child> = if !is_dev {
        let log_path = get_data_dir().join("debug.log");
        let _ = std::fs::write(&log_path, "=== Starting ===\n");

        match find_server() {
            Some(standalone_dir) => {
                let data_dir = get_data_dir();
                let db_path = data_dir.join("db").join("custom.db");

                log(&format!("Standalone: {:?}", standalone_dir));
                log(&format!("DB: {:?}", db_path));

                if !db_path.exists() {
                    let db_src = standalone_dir.join("db").join("custom.db");
                    if db_src.exists() { let _ = std::fs::copy(&db_src, &db_path); }
                }

                let init_script = standalone_dir.join("init-db.js");
                if init_script.exists() {
                    let mut cmd = Command::new("node");
                    cmd.arg(&init_script)
                        .current_dir(&data_dir)
                        .env("DATABASE_URL", format!("file:{}", db_path.display()));
                    #[cfg(windows)]
                    { cmd.creation_flags(CREATE_NO_WINDOW); }
                    if let Ok(o) = cmd.output() {
                        log(&format!("init-db: {}", String::from_utf8_lossy(&o.stderr)));
                    }
                }

                let server_path = standalone_dir.join("server.js");
                let stdout_log = data_dir.join("server-stdout.log");
                let stderr_log = data_dir.join("server-stderr.log");
                let stdout_file = OpenOptions::new().create(true).write(true).truncate(true).open(&stdout_log).ok();
                let stderr_file = OpenOptions::new().create(true).write(true).truncate(true).open(&stderr_log).ok();

                let child = {
                    let mut cmd = Command::new("node");
                    cmd.arg(&server_path)
                        .current_dir(&standalone_dir)
                        .env("NODE_ENV", "production")
                        .env("PORT", "3000")
                        .env("HOSTNAME", "127.0.0.1")
                        .env("DATABASE_URL", format!("file:{}", db_path.display()))
                        .env("TMDB_API_KEY", "39adf355a4930c90981a9d8abc608dec")
                        .env("TMDB_READ_ACCESS_TOKEN", "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA");
                    if let Some(ref f) = stdout_file { cmd.stdout(Stdio::from(f.try_clone().unwrap())); }
                    if let Some(ref f) = stderr_file { cmd.stderr(Stdio::from(f.try_clone().unwrap())); }
                    #[cfg(windows)]
                    { cmd.creation_flags(CREATE_NO_WINDOW); }
                    cmd.spawn()
                };

                match child {
                    Ok(c) => {
                        log(&format!("PID: {}", c.id()));
                        if wait_for_server(Duration::from_secs(30)) {
                            log("Ready!");
                        } else {
                            log("TIMEOUT");
                            if let Ok(c) = std::fs::read_to_string(&stderr_log) { log(&format!("stderr:\n{}", c)); }
                        }
                        Some(c)
                    }
                    Err(e) => { log(&format!("Failed: {}", e)); None }
                }
            }
            None => { log("server.js NOT FOUND"); None }
        }
    } else {
        wait_for_server(Duration::from_secs(60));
        None
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerState(Mutex::new(server_child)))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<ServerState>() {
                    if let Some(mut c) = state.0.lock().unwrap().take() {
                        let _ = c.kill(); let _ = c.wait();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            log(&format!("FATAL: {}", e));
        });
}
