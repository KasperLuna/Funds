import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Container,
  Grid,
  Group,
  NumberInput,
  Popover,
  Table,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme
} from '@mantine/core'
import { BsChevronDoubleRight } from 'react-icons/bs'
import { AiOutlineEdit } from 'react-icons/ai'
import { BiTrash } from 'react-icons/bi'
import { DatePicker } from '@mantine/dates';
import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link';
import { useForm, useMediaQuery } from '@mantine/hooks'
import { useState } from 'react'


const banks = [
  {
    name: 'BPI',
    balance: 100,
    color: 'red',
    textColor: 'white',
  },
  {
    name: 'CIMB',
    balance: 200,
    color: 'red',
    textColor: 'white',
  },
  {
    name: 'BDO',
    balance: 300,
    color: 'purple',
    textColor: '#ffffff',
  },
  {
    name: 'AFPSLAI Capital',
    balance: 100,
    color: 'green',
    textColor: '#ffffff',
  },
  {
    name: 'AFPSLAI Savings',
    balance: 200,
    color: 'green',
    textColor: '#ffffff',
  },
  {
    name: 'CASH',
    balance: 300,
    color: 'limegreen',
    textColor: '#ffffff',
  },
];

type StatItemProps = {
  name: string,
  color: string,
  textColor: string,
  balance: number,
}

const StatItem = (props: StatItemProps) => {
  const { name, color, textColor, balance } = props;
  return (
    <>
      <Grid.Col span={2} >
        <Tooltip label={`Visit options for ${name}`} openDelay={600} withArrow color={"gray"}>
          <Container
            sx={{
              backgroundColor: color,
              boxShadow: `5px 5px 5px 0px rgba(255,255,255,0.15)`,
              height: "75px",
              borderRadius: 10,
              padding: "10px",
              maxWidth: "200px",
              minWidth: "130px",
              ':hover': {
                transform: "scale(1.05)",
                boxShadow: `5px 5px 5px 0px rgba(255,255,255,0.15)`,
                filter: "brightness(110%)",
              }
              // overflowWrap: "anywhere",
            }}>
            <Text
              size={'sm'}
              weight={'bolder'}
              color={textColor}
            >
              {name}
            </Text>

            <Text
              size='lg'
              weight="normal"
              color={textColor}>
              {`${balance.toLocaleString(undefined, { style: "currency", currency: "PHP", maximumFractionDigits: 2 })}`}
            </Text>
          </Container>
        </Tooltip>
      </Grid.Col>
    </>
  )
};

const TableHeaders = () => {
  return (
    <>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Bank</th>
        <th>Balance</th>
      </tr>
    </>
  )
}

const fakeTableData = [
  {
    date: new Date(2020, 0, 1),
    description: 'Initial Deposit',
    bank: 'BPI',
    balance: 100,

  },
  {
    date: new Date(2020, 0, 1),
    description: 'Bought Shit',
    bank: 'BPI',
    balance: -100,
  },
  {
    date: new Date(2020, 0, 1),
    description: 'Bought Shit',
    bank: 'BPI',
    balance: -100,
  },
  {
    date: new Date(2020, 0, 1),
    description: 'Sold Shit',
    bank: 'BDO',
    balance: -100,
  },
  {
    date: new Date(2020, 0, 1),
    description: 'Made Shit',
    bank: 'BPI',
    balance: -100,
  },
  {
    date: new Date(2020, 0, 1),
    description: 'Burned Shit',
    bank: 'BPI',
    balance: -100,
  },
  {
    date: new Date(2020, 0, 1),
    description: 'Burned Shit',
    bank: 'BPI',
    balance: -100,
  },
]

interface UserEditFormProps {
  initialValues: { date: Date, description: string, bank: string, balance: number };
  onSubmit(values: { date: Date, description: string, bank: string, balance: number }): void;
  onCancel(): void;
}

function TransactionEditForm({ initialValues, onSubmit, onCancel }: UserEditFormProps) {
  const isMobile = useMediaQuery('(max-width: 755px');

  const form = useForm({
    initialValues,
    // validationRules: {
    //   name: (value) => value.trim().length > 2,
    //   email: (value) => value.trim().length > 2,
    // },
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <DatePicker
        placeholder="Pick date"
        label="Date"
        style={{ minWidth: isMobile ? 220 : 300 }}
        required
        value={form.values.date} />
      <TextInput
        required
        label="Description"
        placeholder="Description"
        style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
        value={form.values.description}
        onChange={(event) => form.setFieldValue('description', event.currentTarget.value)}
        error={form.errors.description}
        variant="default"
      />

      <TextInput
        required
        label="Bank"
        placeholder="Bank"
        style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
        value={form.values.bank}
        onChange={(event) => form.setFieldValue('bank', event.currentTarget.value)}
        error={form.errors.bank}
        variant="default"
      />

      <NumberInput
        required
        label="Balance"
        placeholder="-100"
        style={{ minWidth: isMobile ? 220 : 300, marginTop: 5 }}
        value={form.values.balance}
        onChange={(event) => form.setFieldValue('bank', event!.valueOf().toString())}
        error={form.errors.bank}
        variant="default"
      />

      <Group position="apart" style={{ marginTop: 5 }}>
        <Anchor component="button" color="gray" size="sm" onClick={onCancel}>
          Cancel
        </Anchor>

        <Group spacing={"xs"}>
          <ActionIcon variant='filled' color={"red"} size="lg"><BiTrash /></ActionIcon>
          <Button type="submit" size="sm">
            Save
          </Button></Group>

      </Group>
    </form>
  );
}

interface TransactionProps {
  date: Date;
  description: string;
  bank: string;
  balance: number;
}


export function EditTransactionPopover({ date, description, bank, balance }: TransactionProps) {
  const [values, setValues] = useState({ date: date, description: description, bank: bank, balance: balance });
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();

  return (
    <Group>
      <Popover
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        placement="end"
        withCloseButton
        title="Edit Transaction"
        transition="pop"
        target={
          <ActionIcon
            variant={theme.colorScheme === 'dark' ? 'hover' : 'light'}
            onClick={() => setOpened((o) => !o)}
          >
            <AiOutlineEdit />
          </ActionIcon>
        }
      >
        <TransactionEditForm
          initialValues={values}
          onCancel={() => setOpened(false)}
          onSubmit={(data) => {
            setValues(data);
            setOpened(false);
          }}
        />
      </Popover>
    </Group>
  );
}

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Financhi</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container sx={{ marginTop: "50px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <Text
            weight={"bolder"}
            sx={{
              fontSize: "30px"
            }}
          >
            Bank Balances
          </Text>
          <Link href="#z" passHref>
            <Button
              variant='outline'
              component='a'
              sx={{ height: "25px" }}
              rightIcon={<BsChevronDoubleRight />}
            >
              Bank Actions
            </Button>
          </Link>

        </Box>


        <Grid grow>
          {banks.map((bank, index) => {
            return <StatItem key={index} {...bank} />
          })}
        </Grid>
        <Text weight={"bolder"} size="lg" sx={{ marginTop: "20px" }}>Latest Transactions</Text>
        <Table striped highlightOnHover captionSide='bottom' >
          <thead><TableHeaders /></thead>
          <tbody>
            {fakeTableData.map((data, index) => {
              return (
                <tr key={index}>
                  <td>{data.date.toDateString()}</td>
                  <td>{data.description}</td>
                  <td>{data.bank}</td>
                  <td>{data.balance.toLocaleString(undefined, { style: "currency", currency: "PHP", maximumFractionDigits: 2 })}</td>
                  <td><EditTransactionPopover {...data} /></td>
                </tr>)
            })}
          </tbody>
          <caption>Seven (7) latest recorded transactions.</caption>
        </Table>
      </Container>

    </>
  )
}

export default Home
