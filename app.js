import express from "express";
import cookieParser from "cookie-parser";
import LogMiddleware from "./middlewares/log.middleware.js";
import ErrorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
import UsersRouter from "./routes/users.router.js";
import ResumeRouter from "./routes/resumes.router.js";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "My API Information",
    },
    servers: [
      {
        url: "/api",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
const app = express();
const PORT = 3020;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use("/api", [UsersRouter, ResumeRouter]);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(ErrorHandlingMiddleware);
app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
