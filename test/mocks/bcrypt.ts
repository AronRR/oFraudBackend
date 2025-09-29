const storedPasswords = new Map<string, string>();
let saltCounter = 0;

export async function genSalt(): Promise<string> {
    saltCounter += 1;
    const base = `mock-salt-${saltCounter.toString().padStart(3, "0")}`;
    return base.padEnd(29, "0").slice(0, 29);
}

export async function hash(password: string, salt: string): Promise<string> {
    const base = Buffer.from(`${salt}:${password}`).toString("base64");
    const hashed = (base + "0".repeat(60)).slice(0, 60);
    storedPasswords.set(hashed, password);
    return hashed;
}

export async function compare(password: string, hashed: string): Promise<boolean> {
    const stored = storedPasswords.get(hashed);
    if (stored === undefined) {
        return false;
    }
    return stored === password;
}

export default { genSalt, hash, compare };
