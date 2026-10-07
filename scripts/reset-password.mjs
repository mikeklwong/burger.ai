import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { createStore } from '../server/store.mjs';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) { console.error('Stop the server, then run: npm run reset-password -- user@example.com'); process.exit(1); }
const store = await createStore(process.env.DATA_DIR || resolve('.data'));
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const password_hash = (await promisify(scrypt)(password,salt,64)).toString('hex');
await store.run(db => {
  const user=db.User.find(x=>x.email===email);if(!user)throw new Error('Account not found');
  Object.assign(user,{salt,password_hash});db.sessions=db.sessions.filter(x=>x.user_id!==user.id);
});
console.log(`New password: ${password}\nGive this password to the account owner through a private channel. Restart the server.`);
