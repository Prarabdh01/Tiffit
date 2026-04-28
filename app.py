from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from models import db
import math
from datetime import datetime

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Load config
from config import DevelopmentConfig
app.config.from_object(DevelopmentConfig)

# Setup CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Setup JWT
jwt = JWTManager(app)

# ==================== CONSTANTS FOR MENU DAYS ====================

DAY_NAME_TO_NUMBER = {
    "MONDAY": 1,
    "TUESDAY": 2,
    "WEDNESDAY": 3,
    "THURSDAY": 4,
    "FRIDAY": 5,
    "SATURDAY": 6,
    "SUNDAY": 7
}
NUMBER_TO_DAY_NAME = {v: k for k, v in DAY_NAME_TO_NUMBER.items()}


# ==================== DATABASE INITIALIZATION ====================

def init_database():
    """Create all tables if they don't exist and patch older schema if needed"""
    db.connect()

    queries = [
        """CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(15) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('STUDENT', 'PROVIDER', 'ADMIN') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",

        """CREATE TABLE IF NOT EXISTS student_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        institute_name VARCHAR(100),
        dietary_preference ENUM('VEG', 'NONVEG', 'MIXED') DEFAULT 'MIXED',
        default_address_id INT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )""",

        """CREATE TABLE IF NOT EXISTS provider_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        description TEXT,
        cuisine_type VARCHAR(50),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        service_radius_km INT DEFAULT 2,
        opening_time TIME,
        closing_time TIME,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        avg_rating FLOAT DEFAULT 0,
        total_reviews INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )""",

        """CREATE TABLE IF NOT EXISTS addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(50),
        line1 VARCHAR(255) NOT NULL,
        line2 VARCHAR(255),
        city VARCHAR(50),
        pincode VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_default BOOLEAN DEFAULT FALSE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )""",

        """CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        meal_type ENUM('LUNCH', 'DINNER', 'BOTH') NOT NULL,
        duration_type ENUM('WEEK', 'MONTH') NOT NULL,
        duration_days INT,
        price FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
        )""",

        """CREATE TABLE IF NOT EXISTS daily_menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        plan_id INT NOT NULL,
        day_number INT NOT NULL,
        menu_date DATE NULL,
        meal_type ENUM('LUNCH', 'DINNER', 'BOTH') NOT NULL,
        items TEXT NOT NULL,
        special_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY(plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
        )""",

        """CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        provider_id INT NOT NULL,
        plan_id INT,
        address_id INT NOT NULL,
        order_type ENUM('SUBSCRIPTION', 'ONETIME') NOT NULL,
        order_date DATE NOT NULL,
        total_amount FLOAT NOT NULL,
        payment_status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
        order_status ENUM('PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') DEFAULT 'PLACED',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(provider_id) REFERENCES provider_profiles(id),
        FOREIGN KEY(plan_id) REFERENCES subscription_plans(id),
        FOREIGN KEY(address_id) REFERENCES addresses(id)
        )""",

        """CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        student_id INT NOT NULL,
        provider_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(provider_id) REFERENCES provider_profiles(id)
        )"""
    ]

    for query in queries:
        db.execute_query(query)

    # ---------- PATCH OLD daily_menus TABLE IF DATABASE ALREADY EXISTS ----------
    columns = db.fetch_all("SHOW COLUMNS FROM daily_menus")
    column_names = [col['Field'] for col in columns] if columns else []

    if 'plan_id' not in column_names:
        db.execute_query("ALTER TABLE daily_menus ADD COLUMN plan_id INT NULL")

    if 'day_number' not in column_names:
        db.execute_query("ALTER TABLE daily_menus ADD COLUMN day_number INT NULL")

    if 'menu_date' in column_names:
        try:
            db.execute_query("ALTER TABLE daily_menus MODIFY COLUMN menu_date DATE NULL")
        except Exception:
            pass

    try:
        fk_check = db.fetch_all("""
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'daily_menus'
        AND COLUMN_NAME = 'plan_id'
        AND REFERENCED_TABLE_NAME = 'subscription_plans'
        """)
        if not fk_check:
            db.execute_query("""
            ALTER TABLE daily_menus
            ADD CONSTRAINT fk_daily_menus_plan
            FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
            """)
    except Exception:
        pass

    try:
        db.execute_query("UPDATE daily_menus SET plan_id = 1 WHERE plan_id IS NULL")
    except Exception:
        pass

    try:
        db.execute_query("UPDATE daily_menus SET day_number = 1 WHERE day_number IS NULL")
    except Exception:
        pass

    # ---------- AUTO-CREATE ADMIN USER ----------
    admin = db.fetch_one(
        "SELECT id FROM users WHERE email = %s",
        ("admin@tiffin.com",)
    )
    if not admin:
        db.execute_query(
            "INSERT INTO users (name, email, phone, password_hash, role) VALUES (%s, %s, %s, %s, %s)",
            (
                "Admin User",
                "admin@tiffin.com",
                "9999999999",
                generate_password_hash("admin123"),
                "ADMIN"
            )
        )

    db.disconnect()
    print("Database initialized successfully!")


# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        db.connect()

        existing_user = db.fetch_one(
            "SELECT id FROM users WHERE email = %s",
            (data['email'],)
        )

        if existing_user:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Email already registered'}), 400

        password_hash = generate_password_hash(data['password'])

        query = """INSERT INTO users (name, email, phone, password_hash, role)
        VALUES (%s, %s, %s, %s, %s)"""

        db.execute_query(query, (
            data['name'],
            data['email'],
            data['phone'],
            password_hash,
            data['role']
        ))

        user = db.fetch_one("SELECT id FROM users WHERE email = %s", (data['email'],))

        if data['role'] == 'STUDENT':
            db.execute_query(
                "INSERT INTO student_profiles (user_id) VALUES (%s)",
                (user['id'],)
            )
        elif data['role'] == 'PROVIDER':
            db.execute_query(
                """INSERT INTO provider_profiles
                (user_id, service_name, latitude, longitude)
                VALUES (%s, %s, %s, %s)""",
                (
                    user['id'],
                    data.get('service_name', 'My Tiffin Service'),
                    float(data.get('latitude', 0)),
                    float(data.get('longitude', 0))
                )
            )

        db.disconnect()
        return jsonify({'success': True, 'message': 'User registered successfully'}), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        db.connect()

        user = db.fetch_one(
            "SELECT id, name, email, role, password_hash FROM users WHERE email = %s",
            (data['email'],)
        )

        if not user or not check_password_hash(user['password_hash'], data['password']):
            db.disconnect()
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        access_token = create_access_token(identity=str(user['id']))
        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': access_token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== PROVIDER ROUTES ====================

@app.route('/api/provider/register', methods=['POST'])
@jwt_required()
def provider_register():
    """Register tiffin service provider"""
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())

        db.connect()

        query = """UPDATE provider_profiles
        SET service_name = %s, description = %s, cuisine_type = %s,
        latitude = %s, longitude = %s, opening_time = %s, closing_time = %s
        WHERE user_id = %s"""

        db.execute_query(query, (
            data['service_name'],
            data.get('description', ''),
            data.get('cuisine_type', ''),
            float(data['latitude']),
            float(data['longitude']),
            data.get('opening_time', '09:00'),
            data.get('closing_time', '21:00'),
            user_id
        ))

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Provider registered. Awaiting admin approval.'
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/plans', methods=['POST'])
@jwt_required()
def create_plan():
    """Create subscription plan"""
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())

        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )

        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        query = """INSERT INTO subscription_plans
        (provider_id, title, description, meal_type, duration_type, duration_days, price)
        VALUES (%s, %s, %s, %s, %s, %s, %s)"""

        db.execute_query(query, (
            provider['id'],
            data['title'],
            data.get('description', ''),
            data['meal_type'],
            data['duration_type'],
            data.get('duration_days', 7),
            float(data['price'])
        ))

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Plan created successfully'
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/plans', methods=['GET'])
@jwt_required()
def get_provider_plans():
    """Get all plans created by the logged-in provider"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )

        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        plans = db.fetch_all(
            "SELECT * FROM subscription_plans WHERE provider_id = %s ORDER BY created_at DESC",
            (provider['id'],)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'plans': plans if plans else []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/plans/<int:plan_id>/menu', methods=['GET'])
@jwt_required()
def get_provider_plan_menu(plan_id):
    """Get all day-wise menus for a provider's selected plan (keyed by day name)."""
    try:
        user_id = int(get_jwt_identity())
        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )
        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        plan = db.fetch_one(
            "SELECT id FROM subscription_plans WHERE id = %s AND provider_id = %s",
            (plan_id, provider['id'])
        )
        if not plan:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Plan not found'}), 404

        menus = db.fetch_all(
            """SELECT day_number, meal_type, items, special_note, menu_date
               FROM daily_menus
               WHERE plan_id = %s
               ORDER BY day_number ASC""",
            (plan_id,)
        )

        menu_by_day = {
            "MONDAY": "",
            "TUESDAY": "",
            "WEDNESDAY": "",
            "THURSDAY": "",
            "FRIDAY": "",
            "SATURDAY": "",
            "SUNDAY": ""
        }
        if menus:
            for row in menus:
                day_name = NUMBER_TO_DAY_NAME.get(row['day_number'])
                if day_name:
                    menu_by_day[day_name] = row['items']

        db.disconnect()

        return jsonify({
            'success': True,
            'menu': menu_by_day
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/plans/<int:plan_id>/menu', methods=['POST'])
@jwt_required()
def save_provider_plan_menu(plan_id):
    """Create or update day-wise menu for a plan (batch by day name)."""
    try:
        data = request.get_json() or {}
        menu = data.get('menu') or {}

        user_id = int(get_jwt_identity())
        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )
        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        plan = db.fetch_one(
            "SELECT id, provider_id, meal_type FROM subscription_plans WHERE id = %s",
            (plan_id,)
        )
        if not plan or plan['provider_id'] != provider['id']:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Plan not found or unauthorized'}), 403

        meal_type = plan['meal_type']

        for day_name, items in menu.items():
            if day_name not in DAY_NAME_TO_NUMBER:
                continue
            day_number = DAY_NAME_TO_NUMBER[day_name]
            items_text = (items or "").strip()

            existing = db.fetch_one(
                """SELECT id FROM daily_menus
                   WHERE plan_id = %s AND day_number = %s""",
                (plan_id, day_number)
            )

            if existing:
                if items_text:
                    db.execute_query(
                        """UPDATE daily_menus
                           SET items = %s, meal_type = %s
                           WHERE id = %s""",
                        (items_text, meal_type, existing['id'])
                    )
                else:
                    db.execute_query(
                        "DELETE FROM daily_menus WHERE id = %s",
                        (existing['id'],)
                    )
            else:
                if items_text:
                    db.execute_query(
                        """INSERT INTO daily_menus
                           (provider_id, plan_id, day_number, menu_date, meal_type, items, special_note)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (
                            provider['id'],
                            plan_id,
                            day_number,
                            None,
                            meal_type,
                            items_text,
                            ''
                        )
                    )

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Menu saved successfully'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/orders', methods=['GET'])
@jwt_required()
def get_provider_orders():
    """Get provider's orders"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )

        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        orders = db.fetch_all(
            """SELECT o.*, u.name as student_name, u.phone as student_phone,
            a.line1, a.line2,
            sp.title AS plan_title
            FROM orders o
            JOIN users u ON o.student_id = u.id
            JOIN addresses a ON o.address_id = a.id
            LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
            WHERE o.provider_id = %s
            ORDER BY o.created_at DESC""",
            (provider['id'],)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'orders': orders if orders else []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/provider/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """Provider updates order status"""
    try:
        data = request.get_json()
        new_status = data.get('status')

        if new_status == 'REJECTED':
            db_status = 'CANCELLED'
        else:
            db_status = new_status

        allowed_statuses = [
            'ACCEPTED',
            'REJECTED',
            'PREPARING',
            'OUT_FOR_DELIVERY',
            'DELIVERED'
        ]

        if new_status not in allowed_statuses:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400

        user_id = int(get_jwt_identity())
        db.connect()

        provider = db.fetch_one(
            "SELECT id FROM provider_profiles WHERE user_id = %s",
            (user_id,)
        )
        if not provider:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404

        order = db.fetch_one(
            "SELECT id FROM orders WHERE id = %s AND provider_id = %s",
            (order_id, provider['id'])
        )
        if not order:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        db.execute_query(
            "UPDATE orders SET order_status = %s WHERE id = %s",
            (db_status, order_id)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'message': f'Order status updated to {new_status}'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== STUDENT ROUTES ====================

@app.route('/api/student/address', methods=['POST'])
@jwt_required()
def add_address():
    """Add student address"""
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())

        db.connect()

        query = """INSERT INTO addresses
        (user_id, label, line1, line2, city, pincode, latitude, longitude, is_default)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""

        db.execute_query(query, (
            user_id,
            data.get('label', 'Home'),
            data['line1'],
            data.get('line2', ''),
            data.get('city', ''),
            data.get('pincode', ''),
            float(data.get('latitude', 0)),
            float(data.get('longitude', 0)),
            data.get('is_default', False)
        ))

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Address added successfully'
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


@app.route('/api/student/nearby-providers', methods=['GET'])
@jwt_required()
def get_nearby_providers():
    """Get tiffin providers within radius"""
    try:
        args = request.args
        student_lat = float(args.get('latitude', 30.2675))
        student_lon = float(args.get('longitude', 77.9960))
        radius = float(args.get('radius', 2))

        db.connect()

        providers = db.fetch_all(
            """SELECT p.*, u.name, u.email, u.phone
            FROM provider_profiles p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'APPROVED'"""
        )

        nearby = []

        if providers:
            for provider in providers:
                distance = haversine_distance(
                    student_lat,
                    student_lon,
                    float(provider['latitude']),
                    float(provider['longitude'])
                )

                if distance <= radius:
                    provider['distance'] = round(distance, 2)
                    nearby.append(provider)

        nearby = sorted(nearby, key=lambda x: x['distance'])

        db.disconnect()

        return jsonify({
            'success': True,
            'providers': nearby
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/plans/<int:provider_id>', methods=['GET'])
def get_plans(provider_id):
    """Get plans of a provider"""
    try:
        db.connect()

        plans = db.fetch_all(
            "SELECT * FROM subscription_plans WHERE provider_id = %s ORDER BY created_at DESC",
            (provider_id,)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'plans': plans if plans else []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/plans/<int:plan_id>/menu', methods=['GET'])
def get_student_plan_menu(plan_id):
    """Get day-wise menu preview for a subscription plan (keyed by day name)."""
    try:
        db.connect()

        plan = db.fetch_one(
            "SELECT * FROM subscription_plans WHERE id = %s",
            (plan_id,)
        )

        if not plan:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Plan not found'}), 404

        menus = db.fetch_all(
            """SELECT day_number, meal_type, items, special_note, menu_date
               FROM daily_menus
               WHERE plan_id = %s
               ORDER BY day_number ASC""",
            (plan_id,)
        )

        menu_by_day = {
            "MONDAY": "",
            "TUESDAY": "",
            "WEDNESDAY": "",
            "THURSDAY": "",
            "FRIDAY": "",
            "SATURDAY": "",
            "SUNDAY": ""
        }
        if menus:
            for row in menus:
                day_name = NUMBER_TO_DAY_NAME.get(row['day_number'])
                if day_name:
                    menu_by_day[day_name] = row['items']

        db.disconnect()

        return jsonify({
            'success': True,
            'menu': menu_by_day
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/order', methods=['POST'])
@jwt_required()
def create_order():
    """Create order"""
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())

        db.connect()

        address_id = data.get('address_id')
        if not address_id:
            addr = db.fetch_one(
                "SELECT id FROM addresses WHERE user_id = %s ORDER BY is_default DESC, id ASC LIMIT 1",
                (user_id,)
            )
            if not addr:
                db.disconnect()
                return jsonify({'success': False, 'message': 'No address found for student'}), 400
            address_id = addr['id']

        query = """INSERT INTO orders
        (student_id, provider_id, plan_id, address_id, order_type,
        order_date, total_amount, payment_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""

        db.execute_query(query, (
            user_id,
            data['provider_id'],
            data.get('plan_id'),
            address_id,
            data['order_type'],
            datetime.now().date(),
            float(data['total_amount']),
            'PAID'
        ))

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Order placed successfully'
        }), 201

    except Exception as e:
        import traceback
        print("ERROR in create_order:", e)
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/orders', methods=['GET'])
@jwt_required()
def get_student_orders():
    """Get student's orders"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        orders = db.fetch_all(
            """SELECT o.*, p.service_name, u.name as provider_name,
            sp.title AS plan_title
            FROM orders o
            JOIN provider_profiles p ON o.provider_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
            WHERE o.student_id = %s
            ORDER BY o.created_at DESC""",
            (user_id,)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'orders': orders if orders else []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== ADMIN ROUTES ====================

@app.route('/api/admin/providers', methods=['GET'])
@jwt_required()
def get_all_providers():
    """Get all providers for admin approval"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        user = db.fetch_one("SELECT role FROM users WHERE id = %s", (user_id,))
        if not user or user['role'] != 'ADMIN':
            db.disconnect()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        providers = db.fetch_all(
            """SELECT p.*, u.name, u.email, u.phone
            FROM provider_profiles p
            JOIN users u ON p.user_id = u.id"""
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'providers': providers if providers else []
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/provider/<int:provider_id>/approve', methods=['PUT'])
@jwt_required()
def approve_provider(provider_id):
    """Approve provider"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        user = db.fetch_one("SELECT role FROM users WHERE id = %s", (user_id,))
        if not user or user['role'] != 'ADMIN':
            db.disconnect()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        db.execute_query(
            "UPDATE provider_profiles SET status = 'APPROVED' WHERE id = %s",
            (provider_id,)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Provider approved successfully'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/provider/<int:provider_id>/reject', methods=['PUT'])
@jwt_required()
def reject_provider(provider_id):
    """Reject provider"""
    try:
        user_id = int(get_jwt_identity())

        db.connect()

        user = db.fetch_one("SELECT role FROM users WHERE id = %s", (user_id,))
        if not user or user['role'] != 'ADMIN':
            db.disconnect()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        db.execute_query(
            "UPDATE provider_profiles SET status = 'REJECTED' WHERE id = %s",
            (provider_id,)
        )

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Provider rejected successfully'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== REVIEW ROUTES ====================

@app.route('/api/review', methods=['POST'])
@jwt_required()
def add_review():
    """Add review for an order"""
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())

        db.connect()

        order = db.fetch_one(
            "SELECT provider_id FROM orders WHERE id = %s AND student_id = %s",
            (data['order_id'], user_id)
        )

        if not order:
            db.disconnect()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        query = """INSERT INTO reviews
        (order_id, student_id, provider_id, rating, comment)
        VALUES (%s, %s, %s, %s, %s)"""

        db.execute_query(query, (
            data['order_id'],
            user_id,
            order['provider_id'],
            int(data['rating']),
            data.get('comment', '')
        ))

        ratings = db.fetch_all(
            "SELECT rating FROM reviews WHERE provider_id = %s",
            (order['provider_id'],)
        )

        if ratings:
            avg_rating = sum(r['rating'] for r in ratings) / len(ratings)
            db.execute_query(
                "UPDATE provider_profiles SET avg_rating = %s, total_reviews = %s WHERE id = %s",
                (avg_rating, len(ratings), order['provider_id'])
            )

        db.disconnect()

        return jsonify({
            'success': True,
            'message': 'Review added successfully'
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    init_database()
    app.run(debug=True, host='0.0.0.0', port=5000)