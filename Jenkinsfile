pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    // DockerHub image repo (change this)
    DOCKERHUB_REPO = "yourdockerhubuser/yourapp"

    // Helm release/chart info
    RELEASE_NAME   = "myapp"
    NAMESPACE      = "myapp"

    // Path to chart in repo
    CHART_DIR      = "helm/myapp"

    // KIND cluster name
    KIND_CLUSTER   = "kind-jenkins"

    // Jenkins creds id for DockerHub username/password
    DOCKERHUB_CRED = "dockerhub-creds"
  }

  triggers {
    // Works with webhook (GitHub) in multibranch
    githubPush()
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
        sh """
          echo "Branch: ${BRANCH_NAME}"
          git rev-parse --short HEAD > .gitsha
          cat .gitsha
        """
      }
    }

    stage("Set Image Tag") {
      steps {
        script {
          env.GIT_SHA = sh(script: "cat .gitsha", returnStdout: true).trim()
          env.IMAGE_TAG = env.GIT_SHA
          env.IMAGE_FULL = "${DOCKERHUB_REPO}:${env.IMAGE_TAG}"
        }
        sh 'echo "Using IMAGE=${IMAGE_FULL}"'
      }
    }

    stage("Docker Build") {
      steps {
        sh """
          docker version
          docker build -t ${IMAGE_FULL} .
        """
      }
    }

    stage("DockerHub Login + Push") {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CRED}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh """
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker push ${IMAGE_FULL}
          """
        }
      }
    }

    stage("Ensure KIND Cluster") {
      steps {
        sh """
          set -e
          if kind get clusters | grep -q "^${KIND_CLUSTER}\$"; then
            echo "KIND cluster ${KIND_CLUSTER} already exists"
          else
            echo "Creating KIND cluster ${KIND_CLUSTER}"
            kind create cluster --name ${KIND_CLUSTER}
          fi

          kubectl cluster-info --context kind-${KIND_CLUSTER}
          kubectl get nodes
        """
      }
    }

    stage("Helm Deploy") {
      steps {
        sh """
          set -e

          # Namespace
          kubectl get ns ${NAMESPACE} >/dev/null 2>&1 || kubectl create ns ${NAMESPACE}

          # (Optional) make sure chart deps are present (if you use dependencies)
          if [ -f "${CHART_DIR}/Chart.yaml" ]; then
            helm dependency update ${CHART_DIR} || true
          fi

          # Deploy/Upgrade using commit SHA tag
          helm upgrade --install ${RELEASE_NAME} ${CHART_DIR} \
            --namespace ${NAMESPACE} \
            --set image.repository=${DOCKERHUB_REPO} \
            --set image.tag=${IMAGE_TAG} \
            --set-string global.gitSha=${GIT_SHA} \
            --wait --timeout 5m

          kubectl rollout status deploy/${RELEASE_NAME} -n ${NAMESPACE} --timeout=180s || true
          kubectl get pods -n ${NAMESPACE} -o wide
          kubectl get svc -n ${NAMESPACE} -o wide
        """
      }
    }
  }

  post {
    always {
      sh """
        echo "Branch built: ${BRANCH_NAME}"
        echo "Image pushed: ${IMAGE_FULL}"
        echo "Helm release: ${RELEASE_NAME} in ns ${NAMESPACE}"
      """
    }
  }
}
