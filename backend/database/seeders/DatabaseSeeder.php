<?php

namespace Database\Seeders;

use App\Models\Game;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedGame(
            'Wingspan',
            'Engine-building bird card game by Elizabeth Hargrave',
            'endgame',
            [
                ['Birds', 'Points printed on each bird card played'],
                ['Bonus Cards', 'Points from bonus card objectives met'],
                ['End-of-Round Goals', 'Tokens earned from end-of-round goal tiles (4 rounds)'],
                ['Eggs', 'Each egg on a bird card scores 1 point'],
                ['Cached Food', 'Each food token cached on a bird card scores 1 point'],
                ['Tucked Cards', 'Each card tucked under a bird scores 1 point'],
            ]
        );

        $this->seedGame(
            'Atiwa',
            'Ecological strategy game set in Ghana by Uwe Rosenberg',
            'endgame',
            [
                ['Fruit Bats', 'Points from fruit bat tokens on your colony tiles'],
                ['Animals', 'Points from wildlife (pangolins, Maxwell\'s duiker, giant pouched rats)'],
                ['Springs', 'Each spring scores 2 points'],
                ['Buildings', 'Points from constructed buildings in your village'],
                ['Villagers', 'Points from people tokens in your village'],
                ['Bonus Cards', 'Points from end-game objective cards'],
            ]
        );

        $this->seedGame(
            'Pinochle',
            'Trick-taking card game played over multiple hands to 1500 points',
            'ingame',
            [
                ['Meld', 'Points from card combinations declared before trick play'],
                ['Tricks', 'Points from aces, tens, and kings taken in tricks (+ 10 for last trick)'],
            ]
        );
    }

    private function seedGame(string $name, string $description, string $scoringType, array $elements): void
    {
        if (Game::where('name', $name)->exists()) {
            return;
        }

        $game = Game::create([
            'name'         => $name,
            'description'  => $description,
            'scoring_type' => $scoringType,
        ]);

        foreach ($elements as $i => [$elName, $elDesc]) {
            $game->elements()->create([
                'name'        => $elName,
                'description' => $elDesc,
                'input_type'  => 'number',
                'sort_order'  => $i,
            ]);
        }
    }
}
