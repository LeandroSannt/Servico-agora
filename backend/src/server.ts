import express, { Request, Response, NextFunction } from "express";
import "express-async-errors";
import routes from './routes'
import "reflect-metadata"
import "./database"
import AppError from './errors/AppErros'



const app = express();

app.use(express.json())
app.use(routes)

app.use(
  (err: Error, request: Request, response: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      return response.status(err.statusCode).json({
        status:'error',
        error: err.message,
      });
    }

    console.error(err)

    return response.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
);


app.listen(5000,()=>{
    console.log("Server is running in port 5000")
})

