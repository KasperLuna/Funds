import {
    Container,
    Table,
    Text
} from '@mantine/core'
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { EditTransactionForm } from '../components/EditTransactionForm';
import dayjs from 'dayjs';

const headers = [
    "Date",
    "Description",
    "Category",
    "Bank",
    "Amount",
]

const TransactionList = () => {
    const transactions = useLiveQuery(async () => {
        return db.transactions.toArray()
    })
    return (
        <>
            <Text weight={"bolder"} size="lg" sx={{ marginTop: "20px" }}>Latest Transactions</Text>
            <Container sx={{ overflowX: "auto", width: "90vw", height: "100%" }}>
                <Table striped highlightOnHover captionSide='bottom' sx={{ marginBottom: 20 }}>
                    <thead><tr>
                        {headers.map((header, index) => {
                            return <th key={index}>{header}</th>
                        })}
                    </tr></thead>
                    <tbody>
                        {Boolean(!transactions?.length) && (<tr><td colSpan={6} style={{ textAlign: "center" }}>No Items. Click &quot;Add&quot; to add a new transaction.</td></tr>)}
                        {transactions?.map((data, index) => {
                            return (
                                <tr key={index}>
                                    <td style={{ whiteSpace: "nowrap" }}>{dayjs(data.date).format("MMM D, YYYY")}</td>
                                    <td>{data.description}</td>
                                    <td>{data.category}</td>
                                    <td>{data.bank}</td>
                                    <td>{data.amount.toLocaleString(undefined, { style: "currency", currency: "PHP", maximumFractionDigits: 2 })}</td>
                                    <td><EditTransactionForm {...data} /></td>
                                </tr>)
                        })}
                    </tbody>
                    <caption>Seven (7) latest recorded transactions.</caption>
                </Table>
            </Container>

        </>
    );
}
export default TransactionList;