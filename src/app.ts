import dotenv from "dotenv"
dotenv.config() // Load environment variables

import compression from "compression"
import cors from "cors"
import express, {Application} from "express"
import helmet from "helmet"
import morgan from "morgan"
import path from "path"

import {runSeeders} from "./lib/PrismaLib"
import {
	accessControl,
	middleware404,
	optionsMiddleware
} from "./middlewares/APIMiddlewares"
import {errorHandler} from "./middlewares/ErrorHandler"
import routes from "./routes/MainRouter"
import {validateJWTToken} from "./utils/Jwt"
import {accessLogStream, logMessage} from "./utils/Logger"

const PORT = process.env.PORT
const BASE_URL_API = process.env.BASE_URL_API

const app: Application = express()

// Access-Control-Allow-Origin
app.use(accessControl)

// Middleware
app.use(cors()) // Cross-Origin Resource Sharing
app.use(compression()) // Gzip Compression
app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({limit: "50mb", extended: true}))
app.use(express.static(path.join(process.cwd(), "public")))

app.use(optionsMiddleware)

// use helmet for Security headers
app.use(helmet.contentSecurityPolicy())
app.use(helmet.crossOriginEmbedderPolicy())
app.use(helmet.crossOriginOpenerPolicy())
app.use(helmet.crossOriginResourcePolicy())
app.use(helmet.dnsPrefetchControl())
app.use(helmet.frameguard())
app.use(helmet.hidePoweredBy())
app.use(helmet.hsts())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())
app.use(helmet.originAgentCluster())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.referrerPolicy())
app.use(helmet.xssFilter())

// Logging middleware for access logs
app.use(morgan("combined", {stream: accessLogStream}))
app.use(morgan("dev")) // Log to console in development

// Routes
app.get("/", async (req, res, next) => {
	res.status(200).send("This is sign-assign-api repo running...")
})
app.use(validateJWTToken)
app.use(routes)

// Route not found middleware
app.use("*", middleware404)

// Error handling middleware to log errors to error logs
app.use(errorHandler)

app.listen(PORT, async () => {
	logMessage("access", `Server running on ${BASE_URL_API} on port ${PORT}`)
	runSeeders()
})
