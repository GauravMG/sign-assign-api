FROM node:20

# Set working directory
WORKDIR /application

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn

# Copy the rest of the application
COPY . /application

# Create the 'uploads' directory for storing files
RUN mkdir -p /application/public/uploads

# Install global packages
RUN npm i -g typescript@5.7.2
RUN npm install --save-dev @types/express @types/node

# Generate Prisma client and run migrations
RUN yarn prisma:generate
RUN yarn prisma:migrate:deploy

# Build the project
RUN yarn build

# Start the application
CMD ["yarn", "start"]
