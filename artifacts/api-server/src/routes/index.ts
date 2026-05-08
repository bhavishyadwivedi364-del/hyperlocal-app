import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import shopsRouter from "./shops";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import usersRouter from "./users";
import feedbackRouter from "./feedback";
import sellerRouter from "./seller";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(shopsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(feedbackRouter);
router.use(sellerRouter);
router.use(adminRouter);

export default router;
