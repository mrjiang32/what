import crypto from "node:crypto";
import globalenv from "../../global/globalenv.js";
import jwt from "jsonwebtoken";

export default {
  generate: () => {
    const SECRET = crypto.randomUUID();

    // 登录签发token
    function signToken(user) {
      return jwt.sign({ id: user.id, role: user.role }, SECRET, {
        expiresIn: "2h",
      });
    }

    return [
      {
        path: "/api/token",
        method: "POST",
        handler: (req, res) => {
          res.status(200).json(signToken(req.body));
        },
      },
    ];
  },
};
