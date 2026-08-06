import globalenv from "../../global/globalenv.js";
import jwt from "jsonwebtoken";

export default {
  generate: () => {
    // 登录签发token
    function signToken(user) {
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.role) {
        throw new Error("User role not found");
      }
      if (!user.id) {
        throw new Error("User id not found");
      }
      return jwt.sign({ id: user.id, role: user.role }, globalenv.secret, {
        expiresIn: "2h",
      });
    }

    return [
      {
        path: "/api/token",
        method: "POST",
        handler: (req, res) => {
          try {
            const token = signToken(req.body);
            res.status(200).json({ token });
          } catch (error) {
            res.status(400).json({ error: error.message });
          }
          // res.status(200).json(signToken(req.body));
        },
      },
    ];
  },
};
