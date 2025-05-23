import express from "express"

import {
	AuthRouter,
	RoleRouter,
	UploadRouter,
	UserRouter,
	AttributeRouter,
	ProductCategoryRouter,
	ProductSubCategoryRouter,
	ProductRouter,
	ProductFAQRouter,
	VariantRouter,
	VariantMediaRouter,
	VariantAttributeRouter,
	SupportTicketRouter,
	SupportTicketMediaRouter,
	BannerRouter
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
router.use("/v1/attribute", new AttributeRouter().router)
router.use("/v1/product-category", new ProductCategoryRouter().router)
router.use("/v1/product-subcategory", new ProductSubCategoryRouter().router)
router.use("/v1/product", new ProductRouter().router)
router.use("/v1/product-faq", new ProductFAQRouter().router)
router.use("/v1/variant", new VariantRouter().router)
router.use("/v1/variant-media", new VariantMediaRouter().router)
router.use("/v1/variant-attribute", new VariantAttributeRouter().router)

// other routes
router.use("/v1/support-ticket", new SupportTicketRouter().router)
router.use("/v1/support-ticket-media", new SupportTicketMediaRouter().router)
router.use("/v1/banner", new BannerRouter().router)

// attribute and variants
// router.use("/v1/attribute", new SupportTicketMediaRouter().router)
// router.use("/v1/variant", new SupportTicketMediaRouter().router)
// router.use("/v1/variant-attribute", new SupportTicketMediaRouter().router)

export default router
