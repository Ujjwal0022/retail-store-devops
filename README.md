# 🌐 Cloud-Native Microservices Platform on Amazon EKS
Deploying and Managing a Production-Ready E-Commerce Application using Terraform, Kubernetes, Helm, GitHub Actions, ArgoCD, Prometheus, and Grafana.
 
![Banner](./docs/images/banner.png)
 
<div align="center">
  <div align="center">

[![Stars](https://img.shields.io/github/stars/LondheShubham153/retail-store-sample-app)](Stars)
![GitHub License](https://img.shields.io/github/license/LondheShubham153/retail-store-sample-app?color=green)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%LondheShubham153%2Fretail-store-sample-app%2Frefs%2Fheads%2Fmain%2F.release-please-manifest.json&query=%24%5B%22.%22%5D&label=release)


  </div>

  <strong>
  <h2>AWS Containers Retail Sample</h2>
  </strong>
</div>

This is a sample application designed to illustrate various concepts related to containers on AWS. It presents a sample retail store application including a product catalog, shopping cart and checkout, deployed using modern DevOps practices including GitOps and Infrastructure as Code.


## Overview

The Retail Store Sample App demonstrates a modern microservices architecture deployed on AWS EKS using GitOps principles. The application consists of multiple services that work together to provide a complete retail store experience:


- **UI Service**: Java-based frontend
- **Catalog Service**: Go-based product catalog API
- **Cart Service**: Java-based shopping cart API
- **Orders Service**: Java-based order management API
- **Checkout Service**: Node.js-based checkout orchestration API


## Application Architecture

The application has been deliberately over-engineered to generate multiple de-coupled components. These components generally have different infrastructure dependencies, and may support multiple "backends" (example: Carts service supports MongoDB or DynamoDB).

![Architecture](https://github.com/aws-containers/retail-store-sample-app/raw/main/docs/images/architecture.png)

## Infrastructure Architecture

The Infrastructure Architecture follows cloud-native best practices:

- **Microservices**: Each component is developed and deployed independently
- **Containerization**: All services run as containers on Kubernetes
- **GitOps**: Infrastructure and application deployment managed through Git
- **Infrastructure as Code**: All AWS resources defined using Terraform
- **CI/CD**: Automated build and deployment pipelines with GitHub Actions

![EKS](docs/images/EKS.gif)

## 🚀 Core DevOps Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=git,github,docker,kubernetes,terraform,githubactions" />
  <br><br>
  <b>Git • GitHub • Docker • Kubernetes • Terraform • GitHub Actions</b>
</p>

---

## ☁️ AWS Cloud Services

<p align="center">
  <img src="https://skillicons.dev/icons?i=aws" width="60"/>
  <br><br>
  <b>Amazon EKS • Amazon ECR • Amazon EC2 • Amazon VPC • IAM • Load Balancer</b>
</p>

---

## 📦 Kubernetes Ecosystem

<p align="center">
  <img src="https://skillicons.dev/icons?i=kubernetes,docker" />
  <br><br>
  <b>Kubernetes • Helm • NGINX Ingress • Cert-Manager • ArgoCD</b>
</p>

---

## 🔄 GitOps & Continuous Delivery

<p align="center">
  <img src="https://skillicons.dev/icons?i=githubactions,github" />
  <br><br>
  <b>GitHub Actions • ArgoCD • Helm • GitOps Workflow</b>
</p>

---

## 📊 Monitoring & Observability

<p align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/prometheus/prometheus-original.svg" width="60"/>
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/grafana/grafana-original.svg" width="60"/>
  <br><br>
  <b>Prometheus • Grafana</b>
</p>

---

## 🛠️ Developer Tools

<p align="center">
  <img src="https://skillicons.dev/icons?i=vscode,bash,git,linux" />
  <br><br>
  <b>AWS CLI • kubectl • Helm CLI • Git • Linux • VS Code</b>
</p>

# Project architecture
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/f88884fb-a060-4c11-a6d1-4e5fb62757c1" />

🧠 Key Features

✅ Production-Ready Microservices Architecture

✅ Infrastructure Provisioning with Terraform

✅ Amazon EKS Auto Mode Deployment

✅ Kubernetes-Based Container Orchestration

✅ GitOps Continuous Delivery with ArgoCD

✅ Helm-Based Application Deployment

✅ NGINX Ingress Controller Integration

✅ Automated TLS Certificate Management with Cert-Manager

✅ Declarative Kubernetes Manifests

✅ Self-Healing & Auto-Sync Deployments

✅ Rolling Updates with Zero/Minimal Downtime

✅ Prometheus Metrics Collection

✅ Grafana Monitoring Dashboards

✅ Scalable & Highly Available Architecture

✅ End-to-End Cloud-Native Deployment Pipeline

## Screenshots
Argocd deployment
<img width="1600" height="861" alt="image" src="https://github.com/user-attachments/assets/09d4ae33-6e48-4544-a02a-ad6cc8a82c1a" />

##  GitHub Actions CI/CD Pipeline
<img width="1600" height="806" alt="image" src="https://github.com/user-attachments/assets/863e36d1-71d6-44a8-9ff7-32fb4b4e5cc0" />

## 🌐 Application Access via NGINX Ingress
<img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/8133b62a-ed1f-4dd4-8b13-f5e6fcd7ea78" />

🚀 Project Flow
## 📦 Project Flow

```text
👨‍💻 Developer
        │
        ▼
📂 GitHub Repository
        │
        ▼
⚙️ GitHub Actions (CI Pipeline)
        │
        ├── Checkout Source Code
        ├── Build Docker Images
        ├── Push Images to Amazon ECR
        └── Update GitOps Manifests
        │
        ▼
📂 GitOps Repository
        │
        ▼
🔄 ArgoCD Auto Sync
        │
        ▼
☸️ Amazon EKS Cluster
        │
        ├── Helm Deployment
        ├── NGINX Ingress Controller
        ├── Cert-Manager
        └── Microservices
        │
        ▼
🌐 AWS Load Balancer
        │
        ▼
👥 End Users
        │
        ▼
📊 Prometheus → 📈 Grafana
```

