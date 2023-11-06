import { OkPacket } from "mysql2";
import connection from "../../db";

import Package, { IPurchasePackage } from "./package.model";
import PurchasePackage from "./package.model";
import Wallet from "../wallet/wallet.model";
import User from "../users/user.model";
import walletRepository from "../wallet/wallet.repository";
import userRepository from "../users/user.repository";

interface IPackageRepository {
  retrieveAll(): Promise<Package[]>;
  retrieveById(packageId: number): Promise<Package | undefined>;
}

class PackageRepository implements IPackageRepository {
  retrieveAll(): Promise<Package[]> {
    let query: string = "SELECT * FROM packages";
    let condition: string = "";

    return new Promise((resolve, reject) => {
      connection.query<Package[]>(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }
  
  retrieveMyAll(userId: number): Promise<Package[]> {
    let query: string = `SELECT * FROM purchase_package
    WHERE user_id = ${userId}`;

    return new Promise((resolve, reject) => {
      connection.query<Package[]>(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  retrieveById(packageId: number): Promise<Package> {
    return new Promise((resolve, reject) => {
      connection.query<Package[]>(
        "SELECT * FROM packages WHERE id = ?",
        [packageId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  purchasePackage(purchaseDetail: IPurchasePackage): Promise<IPurchasePackage> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "INSERT INTO purchase_package (user_id, package_id, status, invest_amount, modified_on) VALUES(?,?,?,?, now())",
        [
          purchaseDetail.user_id,
          purchaseDetail.package_id,
          purchaseDetail.status,
          purchaseDetail.invest_amount,
        ],
        (err, res) => {
          if (err) reject(err.message);
          else
            this.retrievePurchasePackageById(res.insertId)
              .then((purchasePackage: IPurchasePackage) => resolve(purchasePackage))
              .catch(reject);
        }
      );
    });
  }


  getPairingRowData(userId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<any[]>(
        "SELECT * FROM pairing WHERE user_id = ?",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  createPairEntry(userId: number, amount: number, type: string = 'create'): Promise<any> {
    if (type === 'create') {
      console.log(`INSERT INTO pairing
      (invest, user_id)
      VALUES(${userId}, ${amount})`);
      return new Promise((resolve, reject) => {
        connection.query<any[]>(
          `INSERT INTO pairing
            (invest, user_id)
            VALUES(${amount}, ${userId})`,
          (err, res) => {
            if (err) reject(err);
            else resolve(res?.[0]);
          }
        );
      });
    } else {
      return new Promise((resolve, reject) => {
        connection.query<any[]>(
          `UPDATE pairing
            SET invest= invest + ROUND(${amount}, 4)
            WHERE user_id=${userId}`,
          (err, res) => {
            if (err) reject(err);
            else resolve(res?.[0]);
          }
        );
      });
    }
  }

  retrievePurchasePackageById(purchaseId: number): Promise<IPurchasePackage> {
    return new Promise((resolve, reject) => {
      connection.query<PurchasePackage[]>(
        "SELECT * FROM purchase_package WHERE id = ?",
        [purchaseId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  async updateUserWallet(wallet: Wallet, amount: number): Promise<Wallet> {
    await userRepository.retrieveById(wallet.user_id);
    return {
      ...wallet, 
      net_wallet: wallet.net_wallet - amount,
      invest_wallet: wallet.invest_wallet + amount
    };
  }
}

export default new PackageRepository();
