import React from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Breadcrumbs,
  createStyles,
  Grid,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { useBanksCategsContext } from "./BanksCategoryContext";
import { useRouter } from "next/router";
import { usePrivacyMode } from "../../utils/helpers";
import { PrivacyModeButton } from "../appshell/PrivacyModeButton";

const useStyles = createStyles((theme) => ({
  root: {
    paddingBottom: "20px",
  },

  value: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      fontSize: 22,
    },
  },

  diff: {
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    padding: 0,
    margin: 0,
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },

  title: {
    fontWeight: 700,
    textTransform: "uppercase",
    maxWidth: "65%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  paper: {
    paddingLeft: 0,
  },

  noBanksBox: {
    textAlign: "center",
    border: `1px dashed ${
      theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[4]
    }`,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.gray[7]
        : theme.colors.gray[5],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    height: "100%",
  },

  headerGroup: {
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },

  bankBalancesText: {
    flexShrink: 1,
  },

  totalBadge: {
    flexShrink: 0,
  },

  skeleton: {
    minHeight: 70,
    width: "100%",
  },
}));

export function BankStats({
  breadcrumbPages,
}: {
  breadcrumbPages?: JSX.Element[];
}) {
  const router = useRouter();
  const bankQuery = router.query["bank"];
  const { bankData } = useBanksCategsContext();
  const { loading, banks } = bankData || {};
  const { privacyMode } = usePrivacyMode();

  const hasBankInProps = bankQuery !== undefined;
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  const filteredBanks = hasBankInProps
    ? banks?.filter((bank) => bank.name === bankQuery)
    : banks;

  const { classes } = useStyles();
  const stats = filteredBanks?.map((bank) => {
    const percentage = (bank.balance / totalAmount) * 100;
    return (
      <Grid.Col
        span={5}
        xs={3}
        sm={3}
        md={4}
        lg={2}
        xl={2}
        p={5}
        key={bank.name || ""}
      >
        <Paper withBorder p="xs" radius="md" className={classes.paper}>
          <Group position="apart" spacing={0} noWrap>
            <Text size="xs" color="dimmed" className={classes.title}>
              {bank.name}
            </Text>

            {!hasBankInProps && (
              <Group spacing={0} noWrap>
                <Text
                  color="cyan"
                  size="xs"
                  weight={500}
                  className={classes.diff}
                >
                  <span>{percentage.toPrecision(2)}%</span>
                </Text>

                <ActionIcon
                  component={Link}
                  href={`/banks/${bank.name}`}
                  size="xs"
                  m={0}
                >
                  <IconExternalLink size={20} />
                </ActionIcon>
              </Group>
            )}
          </Group>

          <Group sx={{ justifyContent: "center" }} spacing={0} mt={10}>
            <Text className={classes.value}>
              {privacyMode
                ? "₱••••••"
                : bank.balance.toLocaleString(undefined, {
                    style: "currency",
                    currency: "PHP",
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0,
                  })}
            </Text>
          </Group>
        </Paper>
      </Grid.Col>
    );
  });
  return (
    <div className={classes.root}>
      <Group
        position="apart"
        align={"end"}
        className={classes.headerGroup}
        noWrap
      >
        <Stack spacing={10}>
          <Breadcrumbs separator="→">{breadcrumbPages}</Breadcrumbs>
          <Title
            weight={"bolder"}
            size="h2"
            className={classes.bankBalancesText}
          >
            {hasBankInProps ? `${bankQuery} Balance` : "Balances"}
          </Title>
        </Stack>
        <Stack>
          {!hasBankInProps && (
            <Badge className={classes.totalBadge}>
              Total:{" "}
              {privacyMode
                ? "₱••••••"
                : `${totalAmount.toLocaleString(undefined, {
                    style: "currency",
                    currency: "PHP",
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0,
                  })}`}
            </Badge>
          )}
          <PrivacyModeButton />
        </Stack>
      </Group>
      <Skeleton visible={loading} className={classes.skeleton} radius="md">
        {Boolean(!banks?.length) ? (
          <Box className={classes.noBanksBox}>
            <Text>No Banks! Select the dropdown and add a bank.</Text>
          </Box>
        ) : (
          <Grid grow>{stats}</Grid>
        )}
      </Skeleton>
    </div>
  );
}
