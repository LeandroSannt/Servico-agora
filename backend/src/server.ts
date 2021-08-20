import express, { Request, Response, NextFunction } from "express";
import "express-async-errors";
import routes from './routes'
import "reflect-metadata"

import "./database"

const app = express();

app.use(express.json())
app.use(routes)


app.listen(5000,()=>{
    console.log("Server is running in port 5000")
})

