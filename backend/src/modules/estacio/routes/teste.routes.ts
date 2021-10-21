import Router from "express";
import TesteController from "../controllers/TesteController";

const testeRouter = Router();

const testeController = new TesteController();

testeRouter.post("/", testeController.post);

export default testeRouter;
