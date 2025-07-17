import express from "express"

import {
	AttributeRouter,
	AuthRouter,
	BannerRouter,
	BlogMediaRouter,
	BlogRouter,
	BusinessClientRouter,
	ChatbotRouter,
	CouponRouter,
	CouponTagRouter,
	InvoiceRouter,
	OrderRouter,
	OrderStaffMappingRouter,
	OrderStaffTaskRouter,
	PaymentRouter,
	ProductAttributeRouter,
	ProductBulkDiscountRouter,
	ProductCategoryRouter,
	ProductFAQRouter,
	ProductMediaRouter,
	ProductRouter,
	ProductRushHourRateRouter,
	ProductSubCategoryRouter,
	RelatedProductRouter,
	RoleRouter,
	RushHourRateRouter,
	SupportTicketMediaRouter,
	SupportTicketRouter,
	TemplateRouter,
	TemplateTagRouter,
	UploadRouter,
	UserAddressRouter,
	UserDiscountRouter,
	UserRouter
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
router.use("/v1/user-address", new UserAddressRouter().router)
router.use("/v1/business-client", new BusinessClientRouter().router)
router.use("/v1/user-discount", new UserDiscountRouter().router)

// product routes
router.use("/v1/attribute", new AttributeRouter().router)
router.use("/v1/product-category", new ProductCategoryRouter().router)
router.use("/v1/product-subcategory", new ProductSubCategoryRouter().router)
router.use("/v1/product", new ProductRouter().router)
router.use("/v1/product-faq", new ProductFAQRouter().router)
router.use("/v1/product-bulk-discount", new ProductBulkDiscountRouter().router)
router.use("/v1/product-rush-hour-rate", new ProductRushHourRateRouter().router)
router.use("/v1/product-media", new ProductMediaRouter().router)
router.use("/v1/product-attribute", new ProductAttributeRouter().router)
router.use("/v1/payment", new PaymentRouter().router)
router.use("/v1/order", new OrderRouter().router)
router.use("/v1/order-staff-mapping", new OrderStaffMappingRouter().router)
router.use("/v1/order-staff-task", new OrderStaffTaskRouter().router)
router.use("/v1/coupon", new CouponRouter().router)
router.use("/v1/coupon-tag", new CouponTagRouter().router)
router.use("/v1/rush-hour-rate", new RushHourRateRouter().router)
router.use("/v1/invoice", new InvoiceRouter().router)
router.use("/v1/related-product", new RelatedProductRouter().router)

// template routes
router.use("/v1/template", new TemplateRouter().router)
router.use("/v1/template-tag", new TemplateTagRouter().router)

// other routes
router.use("/v1/support-ticket", new SupportTicketRouter().router)
router.use("/v1/support-ticket-media", new SupportTicketMediaRouter().router)
router.use("/v1/banner", new BannerRouter().router)
router.use("/v1/blog", new BlogRouter().router)
router.use("/v1/blog-media", new BlogMediaRouter().router)
router.use("/v1/chatbot", new ChatbotRouter().router)

export default router
