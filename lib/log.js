import fs from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config();
/**
* @param {'info' | 'error' | 'warning'} type
*/
export async function log(type, ...message) {
    const time = new Date();
    const now = time.toISOString();
    try {
        const content = `${now}, ${type.toUpperCase()}, ${message.join(' ')}`;
        if (process.env.ENABLE_CONSOLE === 'true') {
            console.log(content);
        }
        await fs.appendFile(process.env.LOG || "./file.log", `${content}\n`);
    } catch (err) {
        console.error(err);
    }
}