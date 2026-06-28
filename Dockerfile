# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Note: The app binds to the ports specified in your list.json.
# You will need to map these ports when running the container (e.g., -p 80:80 -p 443:443).

# Define the command to run your app
CMD ["npm", "start"]
