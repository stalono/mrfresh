import { appendFile, writeFile } from "fs/promises";

export async function log(text: string) {
    await appendFile(`${process.cwd()}/logs.txt`, `${text}\n`, { encoding: 'utf-8' });
}

export async function logWhipeout() {
    await writeFile(`${process.cwd()}/logs.txt`, '', { encoding: 'utf-8' });
}