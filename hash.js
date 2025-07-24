import bcrypt from 'bcrypt';

const plainPassword = 'superadmin123';
const saltRounds = 10;

async function hashPassword(password) {
  const hashed = await bcrypt.hash(password, saltRounds);
  console.log("Hashed password:", hashed);
  return hashed;
}

hashPassword(plainPassword);
