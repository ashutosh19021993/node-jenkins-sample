pipeline {
  agent any

  options {
    disableConcurrentBuilds()
  }

  environment {
    DOCKERHUB_REPO = "yourdockerhubuser/yourapp"
    RELEASE_NAME   = "myapp"
    NAMESPACE      = "myapp"
    CHART_DIR      = "helm/myapp"
    KIND_CLUSTER   = "kind-jenkins"
    DOCKERHUB_CRED = "dockerhub-creds"
  }



  stages {
    stage("Checkout") {
      steps {
        checkout scm
        sh '''
          echo "Branch: ${BRANCH_NAME:-unknown}"
          git rev-parse --short HEAD > .gitsha
          cat .gitsha
        '''
      }
    }

    stage("Set Image Tag") {
      steps {
        script {
          env.GIT_SHA    = sh(script: "cat .gitsha", returnStdout: true).trim()
          env.IMAGE_TAG  = env.GIT_SHA
          env.IMAGE_FULL = "${DOCKERHUB_REPO}:${env.IMAGE_TAG}"
        }
        sh 'echo "Using IMAGE=${IMAGE_FULL}"'
      }
    }

    stage("Docker Build") {
      steps {
        sh '''
          docker version
          docker build -t ${IMAGE_FULL} .
        '''
      }
    }

    stage("DockerHub Login + Push") {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CRED}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker push ${IMAGE_FULL}
          '''
        }
      }
    }



    stage("Helm Deploy") {
      steps {
        sh '''
          set -e
          kubectl get ns ${NAMESPACE} >/dev/null 2>&1 || kubectl create ns ${NAMESPACE}

          if [ -f "${CHART_DIR}/Chart.yaml" ]; then
            helm dependency update ${CHART_DIR} || true
          fi

          helm upgrade --install ${RELEASE_NAME} ${CHART_DIR} \
            --namespace ${NAMESPACE} \
            --set image.repository=${DOCKERHUB_REPO} \
            --set image.tag=${IMAGE_TAG} \
            --wait --timeout 5m

          kubectl get pods -n ${NAMESPACE} -o wide
          kubectl get svc -n ${NAMESPACE} -o wide
        '''
      }
    }
  }
}
