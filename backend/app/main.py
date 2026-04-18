import email

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta
import atexit
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.extensions import init_db
import app.extensions as ext

from app.routes.auth_routes import auth_bp
from app.routes.api_routes import api_bp

# ✅ From first file
from app.routes.pricing_routes import pricing_bp
from app.routes.admin_routes import admin_bp
from app.utils.stream_worker import start_worker_thread, stop_worker
from app.redis_client import get_redis
from app.extensions import client as mongo_client

load_dotenv()


def send_receipt_email(order, to_email):
    """Send a professional HTML receipt email via SMTP."""
    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_login = os.getenv("SMTP_LOGIN", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        from_email = os.getenv("SMTP_EMAIL", smtp_login)

        items_html = "".join([
            f"""
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;">{item.get('name','')}</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;text-align:center;">{item.get('quantity',1)}</td>
              <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">
                &#8377;{(item.get('price',0) * item.get('quantity',1)):.2f}
              </td>
            </tr>"""
            for item in order.get("items", [])
        ])

        discount_row = ""
        if order.get("discount", 0) > 0:
            vc = order.get("voucher_code", "")
            discount_row = f"""
            <tr>
              <td colspan="2" style="padding:8px 0;font-size:14px;color:#10b981;">Discount {f'({vc})' if vc else ''}</td>
              <td style="padding:8px 0;font-size:14px;color:#10b981;font-weight:700;text-align:right;">−&#8377;{order.get('discount',0):.2f}</td>
            </tr>"""

        html = f"""
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Order Receipt</title></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- HEADER -->
                <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SmartCommerceAI</div>
                         <div style="font-size:13px;color:#64748b;margin-top:4px;">Order Confirmation &amp; Receipt</div></td>
                      <td align="right"><div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 14px;display:inline-block;">
                         <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Order ID</div>
                         <div style="font-size:14px;font-weight:700;color:#10b981;font-family:monospace;margin-top:2px;">{order.get('order_id','')}</div>
                      </div></td>
                    </tr>
                  </table>
                </td></tr>

                <!-- SUCCESS BANNER -->
                <tr><td style="background:#ecfdf5;padding:20px 40px;border-bottom:1px solid #d1fae5;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;background:#10b981;border-radius:50%;text-align:center;vertical-align:middle;font-size:18px;color:#fff;">✓</td>
                      <td style="padding-left:12px;">
                        <div style="font-size:15px;font-weight:700;color:#065f46;">Payment Confirmed</div>
                        <div style="font-size:13px;color:#059669;margin-top:2px;">Your order is on its way! Est. Delivery: {order.get('estimated_delivery','3-5 days')}</div>
                      </td>
                    </tr>
                  </table>
                </td></tr>

                <!-- ORDER DETAILS -->
                <tr><td style="padding:32px 40px;">

                  <!-- Info Grid -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="width:50%;vertical-align:top;">
                        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Delivery Address</div>
                        <div style="font-size:14px;color:#0f172a;font-weight:500;line-height:1.5;">{order.get('delivery_address','N/A')}</div>
                        <div style="font-size:14px;color:#64748b;margin-top:4px;">📱 {order.get('delivery_phone','N/A')}</div>
                      </td>
                      <td style="width:50%;vertical-align:top;padding-left:24px;">
                        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Order Info</div>
                        <div style="font-size:14px;color:#475569;margin-bottom:4px;">Date: <span style="color:#0f172a;font-weight:600;">{datetime.utcnow().strftime('%d %b %Y')}</span></div>
                        <div style="font-size:14px;color:#475569;">Payment: <span style="color:#0f172a;font-weight:600;">{order.get('payment_method','Cash on Delivery')}</span></div>
                      </td>
                    </tr>
                  </table>

                  <!-- Items Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                    <thead>
                      <tr style="border-bottom:2px solid #e2e8f0;">
                        <th style="padding:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Item</th>
                        <th style="padding:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Qty</th>
                        <th style="padding:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>{items_html}</tbody>
                  </table>

                  <!-- Totals -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:28px;">
                    <tbody>
                      {discount_row}
                      <tr>
                        <td colspan="2" style="padding:8px 0;font-size:18px;font-weight:800;color:#0f172a;border-top:2px solid #e2e8f0;">Total Paid</td>
                        <td style="padding:8px 0;font-size:20px;font-weight:800;color:#10b981;text-align:right;border-top:2px solid #e2e8f0;">&#8377;{order.get('total',0):.2f}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- CTA -->
                  <div style="text-align:center;padding:20px 0;">
                    <a href="http://localhost:5173/orders" style="display:inline-block;background:#0f172a;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:-0.3px;">View Order Status →</a>
                  </div>

                </td></tr>

                <!-- FOOTER -->
                <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                  <div style="font-size:13px;color:#94a3b8;">SmartCommerceAI · Powered by Dynamic Intelligence</div>
                  <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">This is an automated receipt. Please do not reply to this email.</div>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"✅ Order Confirmed — {order.get('order_id', '')} | SmartCommerceAI"
        msg["From"] = f"SmartCommerceAI <{from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_login, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())

        print(f"[Email] Receipt sent to {to_email} for order {order.get('order_id')}")
    except Exception as e:
        print(f"[Email] Failed to send receipt: {e}")



def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:5174"]}},
        supports_credentials=True
    )

    # ── DB Init ─────────────────────────────
    init_db(app)

    cart_collection = ext.db["carts_collection"]
    orders_collection = ext.db["orders"]

    # ── Start Redis Worker (priority from first file) ──
    start_worker_thread()

    # ── Blueprints ──────────────────────────
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(api_bp)
    app.register_blueprint(pricing_bp)
    app.register_blueprint(admin_bp)

    # ── Basic Routes ────────────────────────
    @app.route("/")
    def home():
        return {"message": "SmartCommerceAI API Running"}

    @app.route("/health")
    def health():
        status = {"api": "ok", "mongo": "ok", "redis": "ok"}

        try:
            mongo_client.admin.command("ping")
        except Exception as e:
            status["mongo"] = str(e)

        try:
            get_redis().ping()
        except Exception as e:
            status["redis"] = str(e)

        return status

    # ════════════════════════════════════════
    # 🛒 CART SYSTEM
    # ════════════════════════════════════════

    @app.route("/add-to-cart", methods=["POST"])
    def add_to_cart():
        payload = request.get_json(force=True)

        email = payload.get("email")
        product_id = payload.get("product_id")
        name = payload.get("name")
        category = payload.get("category")
        sub_category = payload.get("sub_category")
        brand = payload.get("brand")
        pricing = payload.get("pricing")
        quantity = payload.get("quantity", 1)

        if isinstance(product_id, str):
            try:
                product_id = int(product_id)
            except:
                pass

        if pricing is None:
            price = payload.get("price")
            if price:
                pricing = {
                    "base_price": float(price),
                    "predicted_price": float(price),
                    "best_price": float(price),
                }

        if not email or product_id is None or not name or not pricing:
            return jsonify({"error": "Missing required fields"}), 400

        cart_collection.update_one(
            {"email": email, "product_id": product_id},
            {
                "$setOnInsert": {
                    "name": name,
                    "category": category,
                    "sub_category": sub_category,
                    "brand": brand,
                    "pricing": pricing,
                },
                "$inc": {"quantity": quantity},
            },
            upsert=True,
        )

        item = cart_collection.find_one(
            {"email": email, "product_id": product_id},
            {"_id": 0}
        )

        return jsonify({"cart_item": item}), 200


    @app.route("/cart/<email>", methods=["GET"])
    def get_cart(email):
        items = list(cart_collection.find({"email": email}, {"_id": 0}))
        return jsonify({"cart_items": items}), 200


    @app.route("/cart/<email>/<product_id>", methods=["PUT"])
    def update_cart(email, product_id):
        payload = request.get_json(force=True)
        quantity = payload.get("quantity", 1)

        try:
            product_id = int(product_id)
        except:
            pass

        if quantity <= 0:
            cart_collection.delete_one({"email": email, "product_id": product_id})
        else:
            cart_collection.update_one(
                {"email": email, "product_id": product_id},
                {"$set": {"quantity": quantity}}
            )

        items = list(cart_collection.find({"email": email}, {"_id": 0})
)
        return jsonify({"cart_items": items})


    @app.route("/cart/<email>/<product_id>", methods=["DELETE"])
    def delete_item(email, product_id):
        try:
            product_id = int(product_id)
        except:
            pass

        cart_collection.delete_one({"email": email, "product_id": product_id})

        items = list(cart_collection.find({"email": email}, {"_id": 0}))
        return jsonify({"cart_items": items})


    @app.route("/cart/<email>", methods=["DELETE"])
    def clear_cart(email):
        cart_collection.delete_many({"email": email})
        return jsonify({"cart_items": []})


    # ════════════════════════════════════════
    # 📦 ORDER SYSTEM
    # ════════════════════════════════════════

    # Inside create_app() in main.py

    @app.route("/orders", methods=["POST"])
    def place_order():
        payload = request.get_json(force=True)
        email = payload.get("email")

        if not email:
            return jsonify({"error": "Email required"}), 400

        # Match the collection name defined at the top of create_app
        cart_items = list(cart_collection.find({"email": email}))

        if not cart_items:
            return jsonify({"error": "Cart empty"}), 400

        total = 0
        items = []

        for item in cart_items:
            # Logic to pick the best available price
            pricing = item.get("pricing", {})
            price = pricing.get("best_price") or pricing.get("base_price") or 0
            qty = item.get("quantity", 1)

            total += price * qty
            items.append({
                "product_id": item.get("product_id"),
                "name": item.get("name"),
                "price": price,
                "quantity": qty,
            })
            
        discount = payload.get("discount", 0)
        voucher_code = payload.get("voucher_code")
        delivery_address = payload.get("delivery_address", "")
        delivery_phone = payload.get("delivery_phone", "")
        save_address = payload.get("save_address", False)
        
        final_total = max(0, total - discount)

        order = {
            "order_id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "email": email,
            "items": items,
            "total": total,
            "created_at": datetime.utcnow().isoformat(),
        }

        orders_collection.insert_one(order)
        order.pop("_id", None)  # remove MongoDB ObjectId — not JSON serializable
        cart_collection.delete_many({"email": email})
        
        user_updates = {}
        if save_address:
            user_updates["address"] = delivery_address
            user_updates["phone"] = delivery_phone

        update_ops = {}
        if user_updates:
            update_ops["$set"] = user_updates
            
        if voucher_code:
            update_ops["$addToSet"] = {"used_vouchers": voucher_code}

        if update_ops:
            try:
                ext.db.users.update_one({"email": email}, update_ops)
            except Exception as e:
                print("Error updating user profile:", e)

        # Send receipt email asynchronously (non-blocking)
        import threading
        threading.Thread(target=send_receipt_email, args=(order, email), daemon=True).start()

        # Convert ObjectId for the response
        order["_id"] = str(order["_id"])
        return jsonify({"order": order}), 201

    @app.route("/orders/<email>", methods=["GET"])
    def get_orders(email):
        # Ensure IDs are strings so React can use them as keys
        orders = list(orders_collection.find({"email": email}))
        for o in orders:
            o["_id"] = str(o["_id"])
        return jsonify({"orders": orders})


    # ── Graceful Shutdown ───────────────────
    atexit.register(stop_worker)

    return app


app = create_app()