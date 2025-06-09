import  express  from"express";
import  bcrypt  from"bcryptjs";
import  jwt  from"jsonwebtoken";
import  prisma  from"../prisma/client.js"; 
import  { login, signup }  from"../controllers/auth.controller.js";
const authRouter = express.Router();

// Signup Route
authRouter.post("/signup",signup)

// Login Route
authRouter.post("/login", login);

export default authRouter;

