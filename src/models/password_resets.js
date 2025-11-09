import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class password_resets extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    password_reset_id: {
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
  defaultValue: Sequelize.literal("NOW() + INTERVAL '15 minutes'")  // ĐÚNG CÚ PHÁP POSTGRES
},
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'password_resets',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "password_resets_pkey",
        unique: true,
        fields: [
          { name: "password_reset_id" },
        ]
      },
    ]
  });
  }
}
