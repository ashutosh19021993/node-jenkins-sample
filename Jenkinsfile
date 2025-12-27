pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-kaniko-helm
spec:
  serviceAccountName: jenkins
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2
      command: ["sh", "-c", "cat"]
      tty: true
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
    - name: helm-kubectl
      image: dtzar/helm-kubectl:3.14.2
      command: ["sh", "-c", "cat"]
      tty: true
  volumes:
    - name: docker-config
      secret:
        secretName: dockerhub-creds
        items:
          - key: .dockerconfigjson
            path: config.json
"""
    }
  }

  options { disableConcurrentBuilds() }

  environment {
    DOCKERHUB_REPO = "ashutosh1993/node-test"
    RELEASE_NAME   = "myapp"
    NAMESPACE      = "myapp"
    CHART_DIR      = "helm/myapp"
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

    stage("Build + Push (Kaniko)") {
      steps {
        container('kaniko') {
          sh '''
            /kaniko/executor \
              --context ${WORKSPACE} \
              --dockerfile ${WORKSPACE}/Dockerfile \
              --destination ${IMAGE_FULL} \
              --snapshotMode=redo
          '''
        }
      }
    }

    stage("Helm Deploy") {
      steps {
        container('helm-kubectl') {
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
}
