import express from "express";
import { prisma } from "../models/index.js";
import authMiddleware from "../middlewares/auth.middlewares.js";
const router = express.Router();

/**
 * @swagger
 * /resume:
 *   post:
 *     summary: 이력서 생성
 *     description: 인증된 사용자의 이력서를 생성합니다.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *                 description: 이력서의 제목.
 *               content:
 *                 type: string
 *                 description: 이력서의 내용.
 *               status:
 *                 type: string
 *                 description: 이력서의 상태.
 *     responses:
 *       201:
 *         description: 이력서 생성 성공. 생성된 이력서 정보가 반환됩니다.
 *       409:
 *         description: 이력서 상태가 유효하지 않은 경우.
 *       401:
 *         description: 인증되지 않은 사용자.
 */

router.post("/resume", authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { title, content, status = "APPLY" } = req.body;

  const Statuses = [
    "APPLY",
    "DROP",
    "PASS",
    "INTERVIEW1",
    "INTERVIEW2",
    "FINAL_PASS",
  ];

  if (!Statuses.includes(status)) {
    return res.status(409).json({
      message: "이력서 상태가 이상합니다.",
    });
  }

  const resume = await prisma.resume.create({
    data: {
      userId: +userId,
      title,
      content,
      status,
    },
  });

  return res.status(201).json({ data: resume });
});

/**
 * @swagger
 * /resume:
 *   get:
 *     summary: 이력서 조회
 *     description: 관리자 권한을 가진 사용자가 이력서 목록을 조회합니다.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderKey
 *         schema:
 *           type: string
 *         description: 정렬을 위한 키
 *       - in: query
 *         name: orderValue
 *         schema:
 *           type: string
 *         description: 정렬을 위한 값
 *     responses:
 *       200:
 *         description: 이력서 조회 성공. 이력서 목록이 반환됩니다.
 *       403:
 *         description: 권한이 없는 사용자.
 */

router.get("/resume", authMiddleware, async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: "권한이 없습니다." });
  }

  const { permission } = req.user;

  if (permission !== "Admin") {
    return res.status(403).json({ message: "권한이 없습니다." });
  }

  const { orderKey, orderValue } = req.query;

  let orderBy = {};
  if (orderKey) {
    orderBy[orderKey] =
      orderValue && orderValue.toUpperCase() === "ASC" ? "asc" : "desc";
  } else {
    orderBy = { createdAt: "desc" };
  }

  const resume = await prisma.resume.findMany({
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy,
  });

  return res.status(200).json({ data: resume });
});

/**
 * @swagger
 * /resume/{resumeId}:
 *   get:
 *     summary: 특정 이력서 조회
 *     description: 주어진 ID에 해당하는 이력서를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 조회할 이력서의 ID
 *     responses:
 *       200:
 *         description: 이력서 조회 성공. 해당 이력서 정보가 반환됩니다.
 *       404:
 *         description: 주어진 ID에 해당하는 이력서가 없는 경우.
 */

router.get("/resume/:resumeId", async (req, res, next) => {
  const { resumeId } = req.params;
  const resume = await prisma.resume.findFirst({
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });
  return res.status(200).json({ data: resume });
});

/**
 * @swagger
 * /resume/{resumeId}:
 *   put:
 *     summary: 이력서 수정
 *     description: 관리자 권한을 가진 사용자의 이력서를 수정합니다.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 수정할 이력서의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *                 description: 이력서의 제목.
 *               content:
 *                 type: string
 *                 description: 이력서의 내용.
 *               status:
 *                 type: string
 *                 description: 이력서의 상태. 가능한 상태는 'APPLY', 'DROP', 'PASS', 'INTERVIEW1', 'INTERVIEW2', 'FINAL_PASS' 입니다.
 *     responses:
 *       200:
 *         description: 이력서 수정 성공. 수정된 이력서 정보가 반환됩니다.
 *       403:
 *         description: 관리자 권한이 없는 사용자.
 *       404:
 *         description: 주어진 ID에 해당하는 이력서가 없는 경우.
 *       409:
 *         description: 이력서 상태가 이상한 경우.
 *       500:
 *         description: 서버 내부 오류.
 */

router.put("/resume/:resumeId", authMiddleware, async (req, res, next) => {
  try {
    const { resumeId } = req.params;
    const { title, content, status } = req.body;
    const { userId, permission } = req.user;

    let resume;
    if (permission !== "Admin")
      return res.status(403).json({ message: "권한이 없습니다." });

    const stauts = [
      "APPLY",
      "DROP",
      "PASS",
      "INTERVIEW1",
      "INTERVIEW2",
      "FINAL_PASS",
    ];

    if (!stauts.includes(status)) {
      return res.status(409).json({
        message: "이력서 상태가 이상합니다.",
      });
    }

    if (permission === "Admin") {
      resume = await prisma.resume.findFirst({
        where: { resumetId: +resumeId },
      });
    } else {
      resume = await prisma.resume.findFirst({
        where: { resumetId: +resumeId, userId },
      });
    }

    if (!resume) {
      return res
        .status(404)
        .json({ message: "해당 이력서를 찾을 수 없습니다." });
    }

    const updatedResume = await prisma.resume.update({
      where: { resumetId: +resumeId },
      data: { title, content, status },
    });

    return res.status(200).json(updatedResume);
  } catch (error) {
    return res.status(500).json({ message: "서버 오류가 발생하였습니다." });
  }
});

/**
 * @swagger
 * /resume/{resumetId}:
 *   delete:
 *     summary: 이력서 삭제
 *     description: 인증된 사용자가 자신의 이력서를 삭제합니다.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumetId
 *         schema:
 *           type: integer
 *         required: true
 *         description: 삭제할 이력서의 ID
 *     responses:
 *       200:
 *         description: 이력서 삭제 성공.
 *       403:
 *         description: 본인이 작성한 이력서만 삭제할 수 있음.
 *       404:
 *         description: 주어진 ID에 해당하는 이력서가 없는 경우.
 *       500:
 *         description: 서버 내부 오류.
 */

router.delete("/resume/:resumetId", authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { resumetId } = req.params;

  try {
    const resume = await prisma.resume.findUnique({
      where: {
        resumetId: +resumetId,
      },
    });

    if (!resume) {
      return res.status(404).json({ message: "이력서를 찾을 수 없습니다." });
    }

    if (resume.userId !== userId) {
      return res.status(403).json({
        message: "본인이 작성한 이력서만 삭제할 수 있습니다.",
      });
    }

    await prisma.resume.delete({
      where: {
        resumetId: +resumetId,
      },
    });
    res.status(200).json({ message: "삭제 성공" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
