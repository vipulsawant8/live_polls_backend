import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kanban Board API",
      version: "1.0.0",
      description: "REST API documentation for Kanban Board App"
    },
    servers: [
      {
        url: "/api/v1"
      }
    ]
  },
  apis: ["./src/routes/*.js"], // Path to route files
  tags: [
  { name: "Auth", description: "Authentication routes" },
  { name: "Lists", description: "Lists CRUD operations" },
  { name: "Tasks", description: "Tasks CRUD operations" }
]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;