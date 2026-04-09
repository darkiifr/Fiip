
import { exists, readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
async function test() {
  console.log(await exists('fonts', { baseDir: BaseDirectory.AppData }));
  console.log(await readDir('fonts', { baseDir: BaseDirectory.AppData }));
}
test();

