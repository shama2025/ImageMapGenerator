from flask_cors import CORS
from flask import Flask

app = Flask(__name__)

CORS(app)

# Auth Endpoints
app.route("/login", methods=["GET"])


def login():
    """"""


app.route("/register", methods=["POST"])


def register():
    """"""


# ImageMap Endpoints
app.route("/image-maps", methods=["GET"])


def get_all_image_maps():
    """"""


app.route("/image-maps/<map>", methods=["GET"])


def get_one_image_map():
    """"""


app.route("/update-image", methods=["PATCH"])


def update_image_map():
    """"""


app.route("/update-image-attribute", methods=["PATCH"])


def update_image_attribute():
    """"""


app.route("/delete-image-map", methods=["DELETE"])


def delete_image_map():
    """"""


if __name__ == "__main__":
    app.run()
