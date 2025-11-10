// models/feedback_reply.js
import { Model, DataTypes } from "sequelize";

export default class FeedbackReply extends Model {
  static init(sequelize) {
    return super.init(
      {
        feedback_reply_id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        feedback_id: {
          type: DataTypes.INTEGER,
          allowNull: false, // NOT NULL như SQL
          references: {
            model: "feedbacks",
            key: "feedback_id",
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
        modelName: "FeedbackReply",
        tableName: "feedback_reply",
        schema: "public",
        timestamps: false,

        // QUAN TRỌNG NHẤT: UNIQUE(feedback_id) → CHỈ 1 REPLY CHO 1 FEEDBACK
        indexes: [
          {
            name: "feedback_reply_pkey",
            unique: true,
            fields: ["feedback_reply_id"],
          },
          {
            name: "feedback_reply_feedback_id_unique",
            unique: true,
            fields: ["feedback_id"], // ĐÚNG NHƯ SQL: UNIQUE (feedback_id)
          },
          {
            name: "idx_feedback_reply_user_id",
            fields: ["user_id"],
          },
        ],
      }
    );
  }
}
