// models/review_reply.js
import { Model, DataTypes } from "sequelize";

export default class ReviewReply extends Model {
  static init(sequelize) {
    return super.init(
      {
        review_reply_id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        review_id: {
          type: DataTypes.INTEGER,
          allowNull: false, // NOT NULL như SQL
          references: {
            model: "reviews",
            key: "review_id",
          },
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false, // NOT NULL như SQL
          references: {
            model: "users",
            key: "user_id",
          },
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        replied_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW, // TIMESTAMPTZ + DEFAULT NOW()
        },
      },
      {
        sequelize,
        modelName: "ReviewReply",
        tableName: "review_reply",
        schema: "public",
        timestamps: false, // vì bạn tự quản created_at → replied_at

        // QUAN TRỌNG NHẤT: UNIQUE(review_id) → CHỈ 1 REPLY CHO 1 REVIEW
        indexes: [
          {
            name: "review_reply_pkey",
            unique: true,
            fields: ["review_reply_id"],
          },
          {
            name: "review_reply_review_id_unique", // tên tự đặt
            unique: true,
            fields: ["review_id"], // ← ĐÚNG NHƯ SQL: UNIQUE (review_id)
          },
          {
            name: "idx_review_reply_user_id",
            fields: ["user_id"],
          },
        ],
      }
    );
  }
}
