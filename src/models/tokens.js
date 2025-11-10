// models/token.js
import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Token extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      token_id: {  // ĐÃ ĐỔI TÊN
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        }
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "reset_password"
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW() + INTERVAL '15 minutes'")  // GIỮ NGUYÊN NHƯ BẠN MUỐN
      },
      used: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }
    }, {
      sequelize,
      tableName: 'tokens',  // ĐÃ ĐỔI TÊN BẢNG
      schema: 'public',
      timestamps: false,
      indexes: [
        {
          name: "tokens_pkey",  // ĐÃ ĐỔI TÊN INDEX
          unique: true,
          fields: [{ name: "token_id" }],  // ĐÃ ĐỔI TÊN FIELD
        },
        {
          name: "tokens_token_unique",  // BONUS: thêm UNIQUE cho token (rất nên có)
          unique: true,
          fields: [{ name: "token" }]
        }
      ]
    });
  }
}