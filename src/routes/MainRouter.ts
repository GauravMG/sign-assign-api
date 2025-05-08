import express from "express"

import {
	AuthRouter,
	RoleRouter,
	UploadRouter,
	UserRouter,
	ProductCategoryRouter,
	ProductSubCategoryRouter
} from "."

const router = express.Router()

// auth routes
router.use("/v1/auth", new AuthRouter().router)

// master routes
router.use("/v1/role", new RoleRouter().router)

// helper routes
router.use("/v1/upload", new UploadRouter().router)

// user routes
router.use("/v1/user", new UserRouter().router)

// product routes
router.use("/v1/product-category", new ProductCategoryRouter().router)
router.use("/v1/product-subcategory", new ProductSubCategoryRouter().router)

// other routes

export default router
