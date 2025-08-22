# Use Fedora as base
FROM fedora:latest

# Install Python, pip, and build dependencies
RUN dnf install -y \
        python3 python3-pip \
        gcc g++ make \
        python3-devel \
        glibc-devel \
        libffi-devel \
        openblas-devel \
    && dnf clean all

# Upgrade pip
RUN pip3 install --upgrade pip

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code including 'data/' directory
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Command to run the backend
CMD ["python3", "src/main.py"]