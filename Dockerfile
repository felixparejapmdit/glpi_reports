# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application into the container
COPY . .

# Build the app for production
RUN npm run build

# Serve the app
CMD ["npm", "start"]

# Expose the port the app runs on
EXPOSE 3000
