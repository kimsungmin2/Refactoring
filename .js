import express from "express";
import { prisma } from "../index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middlewares.js";
import { Prisma } from "@prisma/client";
import axios from "axios";
import { sendVerificationEmail } from "../middlewares/sendEmail.middlewares.js";

const router = express.Router();

router.post("/ad/sign-up", async (req, res) => {
  try {
    const { email, password, Checkpass, name } = req.body;
    if (password.length < 6) {
      return res.status(409).json({
        message: "비밀번호가 6자 이상이어야 됩니다.",
      });
    }
    if (password !== Checkpass) {
      return res.status(409).json({
        message: "비밀번호 확인과 일치해야 합니다.",
      });
    }
    const isExistUser = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (isExistUser) {
      return res.status(409).json({ message: "이미 존재하는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await prisma.$transaction(
      async (tx) => {
        const user = await tx.users.create({
          data: {
            email,
            password: hashedPassword,
            Checkpass: hashedPassword,
            name,
            permission: "Admin",
            emailstatus: "yes",
          },
        });
        return [user];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (err) {
    next(err);
  }
});

router.post("/sign-up", async (req, res, next) => {
  try {
    const { email, password, Checkpass, name, emailstatus } = req.body;
    if (password.length < 6) {
      return res.status(409).json({
        message: "비밀번호가 6자 이상이어야 됩니다.",
      });
    }
    if (password !== Checkpass) {
      return res.status(409).json({
        message: "비밀번호 확인과 일치해야 합니다.",
      });
    }
    const isExistUser = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (isExistUser) {
      return res.status(409).json({ message: "이미 존재하는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await prisma.$transaction(
      async (tx) => {
        const token = Math.floor(Math.random() * 900000) + 100000;
        const user = await tx.users.create({
          data: {
            email,
            password: hashedPassword,
            Checkpass: hashedPassword,
            name,
            emailstatus: "nono", // 상태를 '가입대기중'으로 설정
            verificationToken: token.toString(), // token을 문자열로 변환하여 저장합니다.
          },
        });

        await sendVerificationEmail(email, token.toString()); // 난수 인증 코드를 이메일로 보냅니다.
        return [user];
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    const token = Math.floor(Math.random() * 900000) + 100000; // 6자리 숫자 난수 생성
    return res.status(201).json({
      message: "회원가입이 완료되었습니다. 이메일 인증 메일을 확인해주세요.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "회원가입에 실패했습니다." });
  }
});

router.post("/sign-up/token", async (req, res, next) => {
  try {
    const { email, token } = req.body;

    const user = await prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    if (user.emailstatus !== "nono") {
      return res
        .status(409)
        .json({ message: "이미 이메일 인증이 완료된 유저입니다." });
    }

    if (user.verificationToken !== token) {
      return res
        .status(400)
        .json({ message: "인증 코드가 일치하지 않습니다." });
    }

    await prisma.users.update({
      where: { userId: user.userId },
      data: { emailstatus: "yes" },
    });

    res.status(200).json({ message: "회원가입이 완료되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});

router.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findFirst({ where: { email } });

  if (!user)
    return res.status(401).json({ message: "존재하지 않는 이메일입니다." });
  else if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });

  const userJWT = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  const refreshToken = jwt.sign(
    { userId: user.userId },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("authorization", `Bearer ${userJWT}`);
  res.cookie("refreshToken", refreshToken);
  return res.status(200).json({ message: "로그인 성공" });
});

router.get("/sign-out", (req, res) => {
  res.clearCookie("authorization");
  res.clearCookie("refreshtoken");
  return res.status(200).json({ message: "로그아웃 성공" });
});

router.post("/refresh", async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: "리프레쉬 토큰이 없습니다." });
  }

  try {
    const { userId } = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const newToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    res.cookie("authorization", `Bearer ${newToken}`);

    return res
      .status(200)
      .json({ message: "새로운 토큰 재발급에 성공했습니다." });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "리프레시 토큰이 유효하지 않습니다." });
  }
});

router.get("/users", authMiddleware, async (req, res, next) => {
  const { userId } = req.user;

  const user = await prisma.users.findFirst({
    where: { userId: +userId },
    select: {
      userId: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      permission: true,
    },
  });

  return res.status(200).json({ data: user });
});

router.get("/oauth", (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}&response_type=code`;
  res.redirect(kakaoAuthUrl);
});

router.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  const tokenRequest = await axios({
    method: "POST",
    url: "https://kauth.kakao.com/oauth/token",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    data: {
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_ID,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code,
    },
  });

  const { access_token } = tokenRequest.data;
  const profileRequest = await axios({
    method: "GET",
    url: "https://kapi.kakao.com/v2/user/me",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const { email, profile } = profileRequest.data.kakao_account;
  const name = profile.nickname;

  const users = await prisma.users.upsert({
    where: { email },
    update: { email, name },
    create: {
      email,
      name,
      password: "default",
      Checkpass: "default",
      emailstatus: "yes",
    },
  });

  const userJWT = jwt.sign({ userId: users.id }, process.env.JWT_SECRET);
  res.cookie("authorization", `Bearer ${userJWT}`);

  return res.status(200).json({ message: "로그인 성공" });
});

router.get("/oauth/logout", async (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.KAKAO_ID}&logout_redirect_uri=${process.env.KAKAO_LOGOUT_URI}`;
  res.redirect(kakaoAuthUrl);
});
router.get("/oauth/logout/callback", (req, res) => {
  return res.status(200).json({ message: "로그아웃 성공" });
});

router.get("/oauth/google", (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email%20profile`;
  res.redirect(googleAuthUrl);
});

router.get("/oauth/google/callback", async (req, res) => {
  const code = req.query.code;
  const tokenRequest = await axios({
    method: "POST",
    url: "https://oauth2.googleapis.com/token",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    data: {
      grant_type: "authorization_code",
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      code,
    },
  });

  const { access_token } = tokenRequest.data;
  const profileRequest = await axios({
    method: "GET",
    url: "https://www.googleapis.com/oauth2/v3/userinfo",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const { email, name } = profileRequest.data;

  const users = await prisma.users.upsert({
    where: { email },
    update: { email, name },
    create: {
      email,
      name,
      password: "default",
      Checkpass: "default",
      emailstatus: "yes",
    },
  });

  const userJWT = jwt.sign({ userId: users.id }, process.env.JWT_SECRET);
  res.cookie("authorization", `Bearer ${userJWT}`);

  return res.status(200).json({ message: "로그인 성공" });
});

router.get("/oauth/google/logout", (req, res) => {
  res.clearCookie("authorization");
  return res.status(200).json({ message: "로그아웃 성공" });
});

export default router;
