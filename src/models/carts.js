// models/carts.js
import { Model, DataTypes } from "sequelize";

export default class Cart extends Model {
  static init(sequelize) {
    return super.init(
      {
        cart_id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          // KHÔNG DÙNG unique: true ở đây → vì unique là COMPOSITE (2 cột)
        },
        product_variant_id: {
          type: DataTypes.INTEGER,
          allowNull: false, // BẮT BUỘC (trùng SQL)
          references: {
            model: "product_variants",
            key: "product_variant_id",
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            min: 1,
          },
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "Cart",
        tableName: "carts",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",

        // ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT: UNIQUE COMPOSITE CHO 2 CỘT
        indexes: [
          {
            name: "carts_pkey",
            unique: true,
            fields: ["cart_id"],
          },
          {
            name: "carts_user_id_product_variant_id_unique", // tên tự đặt
            unique: true,
            fields: ["user_id", "product_variant_id"], // ← UNIQUE COMPOSITE ĐÚNG NHƯ SQL
          },
          {
            name: "idx_carts_user_id",
            fields: ["user_id"],
          },
          {
            name: "idx_carts_variant_id",
            fields: ["product_variant_id"],
          },
        ],
      }
    );
  }
}
