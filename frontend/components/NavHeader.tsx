import { useState } from 'react';
import {
    createStyles,
    Container,
    Avatar,
    UnstyledButton,
    Group,
    Text,
    Menu,
    Tabs,
} from '@mantine/core';
import {
    IconLogout,
    IconSettings,
    IconSwitchHorizontal,
    IconChevronDown,
} from '@tabler/icons';

const useStyles = createStyles((theme) => ({
    header: {
        paddingTop: theme.spacing.md,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        zIndex: 11,
        "@media screen and (display-mode: standalone)": {
            marginTop: -40,
            paddingTop: "60px",
            position: "fixed",
        }
    },

    user: {
        marginBottom: 10,
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        padding: `${theme.spacing.xs}px ${theme.spacing.xs}px`,
        borderRadius: theme.radius.sm,
        transition: 'background-color 100ms ease',

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
        },
    },

    userName: {
        [theme.fn.smallerThan('xs')]: {
            display: 'none',
        },
    },

    userActive: {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
    },

    tabs: {
        // [theme.fn.smallerThan('sm')]: {
        //     display: 'none',
        // },
    },

    tabsList: {
        borderBottom: '0 !important',
    },

    tab: {
        fontWeight: 500,
        height: 35,
        backgroundColor: 'transparent',


        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
        },

        '&[data-active]': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
            borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2],
        },
    },
}));

interface HeaderTabsProps {
    user: { name: string; image: string };
    tabs: string[];
}

const data = {
    "user": {
        "name": "Kasper",
        "email": "janspoon@fighter.dev",
        "image": "https://kasperluna.com/face.webp"
    },
    "tabs": [
        "Home",
        "Banks",
        "Crypto",
    ]
}

export function NavHeader() {
    const { classes, cx } = useStyles();
    const [userMenuOpened, setUserMenuOpened] = useState(false);

    const { user, tabs } = data;

    const items = tabs.map((tab) => (
        <Tabs.Tab value={tab} key={tab}
        // disabled={tab == "Crypto" ? true : false}
        >
            {tab}
        </Tabs.Tab>
    ));

    return (
        <div className={classes.header}>
            <Container>
                <Group position="apart">
                    {/* <MantineLogo size={28} /> */}
                    <Text sx={{ paddingBottom: 10, paddingLeft: 1 }}>Funds</Text>

                    <Container sx={{ alignSelf: "end" }}>
                        <Tabs
                            defaultValue="Home"
                            variant="outline"
                            classNames={{
                                root: classes.tabs,
                                tabsList: classes.tabsList,
                                tab: classes.tab,
                            }}
                        >
                            <Tabs.List>{items}</Tabs.List>
                        </Tabs>
                    </Container>

                    <Menu
                        width={260}
                        position="bottom-end"
                        transition="pop-top-right"
                        onClose={() => setUserMenuOpened(false)}
                        onOpen={() => setUserMenuOpened(true)}
                    >
                        <Menu.Target>
                            <UnstyledButton
                                className={cx(classes.user, { [classes.userActive]: userMenuOpened })}
                            >
                                <Group spacing={7}>
                                    <Avatar src={user.image} alt={user.name} radius="xl" size={20} />
                                    <Text weight={500} className={classes.userName} size="sm" sx={{ lineHeight: 1 }} mr={3}>
                                        {user.name}
                                    </Text>
                                    <IconChevronDown size={12} stroke={1.5} />
                                </Group>
                            </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Settings</Menu.Label>
                            <Menu.Item icon={<IconSettings size={14} stroke={1.5} />}>Account settings</Menu.Item>
                            <Menu.Item icon={<IconLogout size={14} stroke={1.5} />}>Toggle Color Scheme</Menu.Item>
                            <Menu.Item icon={<IconSwitchHorizontal size={14} stroke={1.5} />}>
                                Change account
                            </Menu.Item>
                            <Menu.Item icon={<IconLogout size={14} stroke={1.5} />}>Logout</Menu.Item>
                            {/* <Menu.Divider /> */}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Container>
        </div>
    );
}