# Use Fedora as the base image
FROM fedora:latest

# Install Node.js and npm
RUN dnf install -y nodejs npm

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the entire project directory to the working directory in the container
COPY . .

# Build the React app (you can customize this based on your React app configuration)
RUN npm run build

# Expose port 3000 to the outside world
EXPOSE 3000

# Run npm start to start the React app
CMD ["npm", "start"]