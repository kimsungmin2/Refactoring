import express from "express";
import { prisma } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middlewares.js";
import { Prisma } from "@prisma/client";
import axios from "axios";
import { sendVerificationEmail } from "../middlewares/sendEmail.middlewares.js";

const router = express.Router();

/**
 * @swagger
 * /ad/sign-up:
 *   post:
 *     summary: 관리자 회원가입
 *     description: 이메일, 비밀번호, 비밀번호 확인, 이름을 사용하여 관리자를 등록합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - Checkpass
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 description: 관리자의 이메일.
 *               password:
 *                 type: string
 *                 description: 관리자의 비밀번호.
 *               Checkpass:
 *                 type: string
 *                 description: 관리자의 비밀번호 확인.
 *               name:
 *                 type: string
 *                 description: 관리자의 이름.
 *     responses:
 *       201:
 *         description: 회원가입이 성공적으로 이루어짐.
 *       409:
 *         description: 비밀번호가 6자 미만이거나, 비밀번호 확인이 일치하지 않거나, 이미 존재하는 이메일인 경우.
 *       500:
 *         description: 서버 내부 오류.
 */

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

/**
 * @swagger
 * /sign-up:
 *   post:
 *     summary: 사용자 회원가입
 *     description: 이메일, 비밀번호, 비밀번호 확인, 이름을 사용하여 사용자를 등록합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - Checkpass
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 description: 사용자의 이메일.
 *               password:
 *                 type: string
 *                 description: 사용자의 비밀번호.
 *               Checkpass:
 *                 type: string
 *                 description: 사용자의 비밀번호 확인.
 *               name:
 *                 type: string
 *                 description: 사용자의 이름.
 *     responses:
 *       201:
 *         description: 회원가입이 성공적으로 이루어짐. 이메일을 통해 확인 메시지가 전송됩니다.
 *       409:
 *         description: 비밀번호가 6자 미만이거나, 비밀번호 확인이 일치하지 않거나, 이미 존재하는 이메일인 경우.
 *       500:
 *         description: 이메일 전송에 실패한 경우.
 */

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
        const token = Math.floor(Math.random() * 900000) + 100000; // 이 부분을 여기로 옮깁니다.
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

    await sendVerificationEmail(email, token.toString()); // 난수 인증 코드를 이메일로 보냅니다.

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
      where: { userId: user.userId }, // 이 부분을 수정
      data: { emailstatus: "yes" },
    });

    res.status(200).json({ message: "회원가입이 완료되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});

/**
 * @swagger
 * /sign-in:
 *   post:
 *     summary: 사용자 로그인
 *     description: 이메일과 비밀번호를 사용하여 사용자를 로그인시킵니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: 사용자의 이메일.
 *               password:
 *                 type: string
 *                 description: 사용자의 비밀번호.
 *     responses:
 *       200:
 *         description: 로그인 성공. JWT 토큰과 리프레시 토큰이 쿠키로 설정됩니다.
 *       401:
 *         description: 존재하지 않는 이메일이거나 비밀번호가 일치하지 않는 경우.
 */

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

/**
 * @swagger
 * /refresh:
 *   post:
 *     summary: 토큰 갱신
 *     description: 리프레시 토큰을 사용하여 새로운 JWT 토큰을 발급받습니다.
 *     responses:
 *       200:
 *         description: 새로운 토큰 재발급에 성공. 새로운 토큰이 쿠키로 설정됩니다.
 *       401:
 *         description: 리프레시 토큰이 없거나 유효하지 않은 경우.
 */

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

/**
 * @swagger
 * /sign-out:
 *   get:
 *     summary: 사용자 로그아웃
 *     description: 사용자의 토큰을 삭제하여 로그아웃을 수행합니다.
 *     responses:
 *       200:
 *         description: 로그아웃 성공. 사용자의 토큰이 삭제됩니다.
 */

router.get("/sign-out", (req, res) => {
  res.clearCookie("authorization");
  res.clearCookie("refreshtoken");
  return res.status(200).json({ message: "로그아웃 성공" });
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 사용자 정보 조회
 *     description: 인증된 사용자의 정보를 조회합니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공. 사용자 정보가 반환됩니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: number
 *                       description: 사용자 ID
 *                     email:
 *                       type: string
 *                       description: 사용자 이메일
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 사용자 계정 생성 날짜
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 사용자 계정 정보 수정 날짜
 *                     permission:
 *                       type: boolean
 *                       description: 사용자 권한
 *       401:
 *         description: 인증되지 않은 사용자
 */

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
    create: { email, name, password: "default", Checkpass: "default" },
  });

  const userJWT = jwt.sign({ userId: users.id }, process.env.JWT_SECRET);
  res.cookie("authorization", `Bearer ${userJWT}`);

  return res.status(200).json({ message: "로그인 성공" });
});

router.get("/oauth/logout", async (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.KAKAO_ID}&logout_redirect_uri=${process.env.KAKAO_LOGOUT_URI}`;
  res.redirect(kakaoAuthUrl);
});

export default router;
