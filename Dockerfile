# Step 1: Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Step 2: Set the working directory in the container
WORKDIR /app

# Step 3: Copy the package.json and package-lock.json into the container
COPY package*.json ./

# Step 4: Install any needed dependencies
RUN npm install

# Step 5: Copy the rest of the application into the container
COPY . .

# Step 6: Build the app for production
RUN npm run build

# Step 7: Install a simple HTTP server to serve the app
RUN npm install -g serve

# Step 8: Expose the port that the app will run on
EXPOSE 3000

# Step 9: Run the app
CMD ["serve", "-s", "build", "-l", "3000"]
