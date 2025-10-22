export enum ExpenseCategory {
  FOOD = "FOOD",
  TRANSPORT = "TRANSPORT",
  OTHER = "OTHER",
  STUDY="STUDY",
}

export enum PaymentMethod {
    CASH = "CASH",
    EWALLET = "E-WALLET",
    CARD = "CARD",
    BANK="BANK",
}


export class ExpenseModel{
    id :string;
    amount :number;
    category :ExpenseCategory;
    description :string;
    expenseDate :string;
    paymentMethod :PaymentMethod;
     constructor(id: string, amount: number, category: string, description: string, expenseDate: string, paymentMethod: string) {
        this.id = id;
        this.amount = amount;
        this.category = ExpenseCategory[category as keyof typeof ExpenseCategory];
        this.description = description;
        this.expenseDate = expenseDate;
        this.paymentMethod = PaymentMethod[paymentMethod as keyof typeof PaymentMethod];
    }


}