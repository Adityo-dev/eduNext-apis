const fs = require('fs');

const swaggerPath = 'swagger.yaml';
let content = fs.readFileSync(swaggerPath, 'utf8');

// 1. Remove the entire duplicate block from line 3765 to the end.
// Look for the comment `# ─────────────────────────────────────────────────────────────────────────` which appears twice around line 3765.
const startMarker = "# ─────────────────────────────────────────────────────────────────────────\n# Merge these `paths` and `components.schemas` blocks into your existing";
const splitIndex = content.indexOf(startMarker);

if (splitIndex !== -1) {
  content = content.substring(0, splitIndex).trim(); // Keep everything before the bad block
}

// 2. Add the Payment and Withdrawal paths at the end of the `paths:` block.
const paymentAndWithdrawalPaths = `
  /payment/initiate/{courseId}:
    post:
      tags: [Payment]
      summary: Student initiates payment/enrollment for a course
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: courseId
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Payment session created
        "400":
          description: Already enrolled / invalid request
        "404":
          description: Course or student not found
        "502":
          description: SSLCommerz session creation failed

  /payment/my-payments:
    get:
      tags: [Payment]
      summary: Student — list own payment history
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of payments

  /payment/success:
    post:
      tags: [Payment]
      summary: SSLCommerz success callback
      responses:
        "303":
          description: Redirects to frontend success page

  /payment/fail:
    post:
      tags: [Payment]
      summary: SSLCommerz fail callback
      responses:
        "303":
          description: Redirects to frontend fail page

  /payment/cancel:
    post:
      tags: [Payment]
      summary: SSLCommerz cancel callback
      responses:
        "303":
          description: Redirects to frontend cancel page

  /payment/ipn:
    post:
      tags: [Payment]
      summary: SSLCommerz server-to-server IPN listener
      responses:
        "200":
          description: IPN acknowledged

  /payment/refund/{paymentId}:
    post:
      tags: [Payment]
      summary: Student requests a refund
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: paymentId
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                reason: { type: string }
      responses:
        "200":
          description: Refund request submitted
        "400":
          description: Refund window expired / already requested

  /payment/refund-requests:
    get:
      tags: [Payment]
      summary: Admin — list all pending refund requests
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of refund requests

  /payment/refund/{paymentId}/process:
    put:
      tags: [Payment]
      summary: Admin — approve or reject a refund request
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: paymentId
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action: { type: string, enum: [approve, reject] }
                adminNote: { type: string }
      responses:
        "200":
          description: Refund processed
        "400":
          description: No pending refund request
        "502":
          description: SSLCommerz refund initiation failed

  /payment/instructor/earnings:
    get:
      tags: [Payment]
      summary: Instructor — earnings summary
      security:
        - bearerAuth: []
      responses:
        "200":
          description: Earnings summary

  /withdrawal:
    post:
      tags: [Withdrawal]
      summary: Instructor requests withdrawal
      security:
        - bearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                accountInfo: { type: string, example: "bKash: 017xxxxxxxx" }
      responses:
        "201":
          description: Withdrawal request created
        "400":
          description: No available balance / pending request already exists
    get:
      tags: [Withdrawal]
      summary: Admin — list withdrawal requests
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: [pending, approved, rejected]
      responses:
        "200":
          description: List of withdrawal requests

  /withdrawal/my-requests:
    get:
      tags: [Withdrawal]
      summary: Instructor — list own withdrawal requests
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of own withdrawal requests

  /withdrawal/{withdrawalId}/process:
    put:
      tags: [Withdrawal]
      summary: Admin — approve or reject a withdrawal request
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: withdrawalId
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action: { type: string, enum: [approve, reject] }
                adminNote: { type: string }
      responses:
        "200":
          description: Withdrawal processed
`;
content += "\n" + paymentAndWithdrawalPaths;

// 3. Insert schemas into components block
const schemasBlock = `
  schemas:
    Payment:
      type: object
      properties:
        _id: { type: string }
        student: { type: string }
        course: { type: string }
        instructor: { type: string }
        enrollment: { type: string }
        tranId: { type: string }
        amount: { type: number }
        commissionRate: { type: number }
        commissionAmount: { type: number }
        instructorEarning: { type: number }
        status:
          type: string
          enum: [pending, paid, failed, cancelled, refunded]
        payoutStatus:
          type: string
          enum: [not_applicable, available, withdrawal_pending, withdrawn]
        paidAt: { type: string, format: date-time }
        refund:
          type: object
          properties:
            status:
              type: string
              enum: [none, requested, approved, rejected, refunded]
            reason: { type: string }
            requestedAt: { type: string, format: date-time }
            processedAt: { type: string, format: date-time }
            refundRefId: { type: string }
            refundedAmount: { type: number }

    Withdrawal:
      type: object
      properties:
        _id: { type: string }
        instructor: { type: string }
        amount: { type: number }
        payments:
          type: array
          items: { type: string }
        status:
          type: string
          enum: [pending, approved, rejected]
        accountInfo: { type: string }
        adminNote: { type: string }
        requestedAt: { type: string, format: date-time }
        processedAt: { type: string, format: date-time }`;

// Find where components: starts
const componentsIndex = content.indexOf('components:\n');
if (componentsIndex !== -1) {
  content = content.replace('components:\n', 'components:\n' + schemasBlock + '\n');
}

fs.writeFileSync(swaggerPath, content);
console.log('Successfully updated swagger.yaml');
