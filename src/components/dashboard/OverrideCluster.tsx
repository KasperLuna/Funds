export const OverrideCluster = () => {
  return (
    <>
      {" "}
      {/* <Button
            onClick={() => {
              Object.values(transactions)
                // .slice(0, 10)
                .forEach(async (transaction) => {
                  const txBank = bankData?.banks.find(
                    (bank) => bank.name === transaction.bank
                  );
                  // console.log(bankData?.banks);
                  const categories = transaction.category.map((categ) => {
                    return categoryData?.categories.find(
                      (cat) => cat.name === categ
                    )?.id;
                  });
                  // console.log(txBank);
                  // console.log(categories);
                  const data = {
                    ...transaction,
                    bank: txBank?.id,
                    categories: categories,
                  };
                  console.log(data);
                  await addTransaction(data);
                });
            }}
          >
            AddTransactions
          </Button> */}
      {/* <Button
            onClick={() => {
              Object.values(banks).forEach(async (bank) => {
                await addBank(bank);
              });
            }}
          >
            AddBanks
          </Button> */}
      {/* <Button
            onClick={() => {
              Object.values(categories).forEach(async (categ) => {
                await addCategory(categ);
              });
            }}
          >
            AddCategs
          </Button> */}
    </>
  );
};
