#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(feature = "desktop")]
fn main() {
    slatedraft_core::run();
}

#[cfg(not(feature = "desktop"))]
fn main() {
    println!("SlateDraft Rust Core Engine v1.0.0 — headless build (enable the `desktop` feature for the GUI)");
}
