import { memo } from "react"
import SingleCard from "./SingleCard"

interface AgentInput {
    variable: string
    datatype: string
    variable_description: string
    Required: boolean
}

interface Agent {
    agent_id: string
    agent_Name: string
    agent_description: string
    agent_Inputs: AgentInput[]
    agent_Type: string
    agent_rating: number
    execution_count: number
    execution_credit: number
    agent_file: boolean
    createdAt: string
    updatedAt: string
    agent_endpoint?: string
    agent_Category?: string // Add the category field
}

interface CardGridProps {
    agents: Agent[]
}

const CardGrid = memo(({ agents }: CardGridProps) => {
    const getGridClasses = () => {
        const count = agents.length

        // Base grid classes
        let gridClasses = "grid gap-8 "

        if (count === 1) {
            // Single card - center it
            gridClasses += "grid-cols-1 justify-items-center max-w-sm mx-auto"
        } else if (count === 2) {
            // Two cards - center them
            gridClasses += "grid-cols-1 sm:grid-cols-2 justify-items-center max-w-2xl mx-auto"
        } else if (count === 3) {
            // Three cards - center them
            gridClasses += "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center max-w-4xl mx-auto"
        } else if (count === 4) {
            // Four cards - 2x2 grid centered
            gridClasses += "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 justify-items-center max-w-3xl mx-auto"
        } else if (count === 5) {
            // Five cards - 3 on top, 2 on bottom (centered)
            gridClasses += "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center max-w-4xl mx-auto"
        } else if (count === 6) {
            // Six cards - 3x2 grid
            gridClasses += "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center max-w-4xl mx-auto"
        } else {
            // More than 6 cards - standard responsive grid
            gridClasses += "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center"
        }

        return gridClasses
    }

    if (agents.length === 0) {
        return (
            <div className="w-full">
                <div className="text-center py-8 text-gray-500">No agents available</div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className={getGridClasses()}>
                {agents.map((agent) => (
                    <SingleCard
                        key={agent.agent_id}
                        title={agent.agent_Name}
                        description={agent.agent_description}
                        executionCount={agent.execution_count}
                        executionCredit={agent.execution_credit}
                        rating={agent.agent_rating}
                        agent_id={agent.agent_id}
                        agent_Type={agent.agent_Type}
                        agent_Category={agent.agent_Category} // Pass the category from API
                    />
                ))}
            </div>
        </div>
    )
})

CardGrid.displayName = "CardGrid"
export default CardGrid
