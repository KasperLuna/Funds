import {
    Container,
    Text,
    Tooltip,
} from '@mantine/core'

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
            <Tooltip label={`Visit options for ${name}`} openDelay={600} withArrow color={"gray"} sx={{ margin: 8 }}>
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
        </>
    )
};

export { StatItem };