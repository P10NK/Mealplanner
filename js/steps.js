/*
 * Cooking steps for every recipe in data.js, keyed by recipe id.
 * Amounts live in the recipe's ingredient list (scaled to the household in the app),
 * so steps refer to ingredients without quantities.
 */
(function (root) {
  'use strict';

  const STEPS = {
    // Breakfast
    'b-parfait': [
      'Thaw the frozen berries in the fridge overnight, or microwave them for 30 seconds.',
      'Spoon half the Greek yogurt into a glass or bowl and top with half the berries.',
      'Add the rest of the yogurt and berries.',
      'Sprinkle the granola on top and drizzle with honey just before eating so it stays crunchy.',
    ],
    'b-shakshuka': [
      'Heat a drizzle of oil in a skillet over medium heat. Cook the diced onion and bell pepper for 5 minutes until soft.',
      'Stir in the spices (cumin and paprika work well) for 30 seconds, then add the canned tomatoes. Simmer 5 minutes until slightly thick.',
      'Make small wells in the sauce and crack an egg into each one.',
      'Cover and cook 5 to 7 minutes, until the whites are set and the yolks are still soft.',
      'Crumble the feta over the top and serve with toasted bread for dipping.',
    ],
    'b-overnight-oats': [
      'In a jar, stir together the oats, milk, chia seeds and peanut butter.',
      'Cover and refrigerate overnight, or at least 4 hours.',
      'In the morning, stir, add a splash of milk if it is too thick, and top with sliced banana.',
    ],
    'b-veggie-scramble': [
      'Whisk the eggs and egg whites with a pinch of salt and pepper.',
      'Heat the oil in a nonstick pan over medium heat. Cook the diced onion and bell pepper for 3 to 4 minutes.',
      'Add the spinach and stir until wilted, about 1 minute.',
      'Pour in the eggs and stir gently until softly set.',
      'Turn off the heat, sprinkle with cheddar and let it melt before serving.',
    ],
    'b-egg-muffins': [
      'Heat the oven to 350°F (or the air fryer to 320°F) and grease a muffin tin or silicone cups.',
      'Whisk the eggs with the spices and a pinch of salt.',
      'Divide the chopped spinach, diced tomato and crumbled feta between the cups, then pour the egg over.',
      'Bake 18 to 22 minutes (air fryer 12 to 15) until puffed and set in the middle.',
      'Cool 5 minutes before removing. They keep in the fridge for 4 days.',
    ],
    'b-protein-smoothie': [
      'Add the almond milk to the blender first.',
      'Add the banana, frozen berries, flaxseed and protein powder.',
      'Blend on high for 45 to 60 seconds until smooth. Add more milk if it is too thick.',
    ],
    'b-avocado-toast': [
      'Toast the bread.',
      'Fry or poach the eggs in a lightly oiled pan over medium heat, about 3 minutes for runny yolks.',
      'Mash the avocado with a pinch of salt, pepper and red pepper flakes.',
      'Spread the avocado on the toast and top each slice with an egg.',
    ],
    'b-pb-toast': [
      'Toast the bread.',
      'Spread the peanut butter on the warm toast.',
      'Top with banana slices and a sprinkle of cinnamon if you like.',
    ],
    'b-cottage-bowl': [
      'Thaw the frozen berries for a few minutes, or microwave them for 30 seconds.',
      'Spoon the cottage cheese into a bowl.',
      'Top with the berries and chopped walnuts, and finish with a pinch of cinnamon.',
    ],
    'b-burrito': [
      'Warm the black beans in a small pan or the microwave. Season with a pinch of salt.',
      'Scramble the eggs in a lightly oiled pan over medium heat until just set.',
      'Warm the tortilla in a dry pan for 20 seconds per side.',
      'Fill the tortilla with eggs, beans, cheddar and salsa. Fold in the sides and roll up.',
      'Optional: toast the burrito seam-side down for 1 minute to seal it.',
    ],
    'b-mug-omelet': [
      'Grease a large microwave-safe mug.',
      'Whisk in the eggs, egg whites, chopped spinach, diced bell pepper and a pinch of salt.',
      'Microwave 45 seconds, stir, then microwave another 30 to 45 seconds until set.',
      'Top with cheddar and let it melt for a minute before eating.',
    ],
    'b-tofu-scramble': [
      'Drain the tofu and pat it dry. Crumble it into bite-size pieces.',
      'Heat the oil in a pan over medium heat. Cook the diced onion and bell pepper for 4 minutes.',
      'Add the tofu and spices (turmeric, garlic powder and salt work well). Cook 5 minutes, stirring, until lightly golden.',
      'Stir in the spinach until wilted and serve.',
    ],
    'b-baked-oat-cups': [
      'Heat the oven to 350°F (or the air fryer to 320°F) and line a muffin tin.',
      'Mix the oats, milk, beaten egg, maple syrup and cinnamon.',
      'Fold in the berries and divide between the cups.',
      'Bake 20 to 25 minutes (air fryer 12 to 15) until golden and set.',
      'Cool before eating. Store in the fridge for up to 5 days.',
    ],
    'b-apple-oatmeal': [
      'Combine the oats, almond milk and cinnamon in a bowl (microwave) or small pot (stovetop).',
      'Microwave 2 to 3 minutes, stirring halfway, or simmer on the stove for 5 minutes.',
      'Stir in the diced apple and flaxseed.',
      'Top with chopped walnuts.',
    ],
    'b-egg-muffin-sandwich': [
      'Cook the bacon in a skillet over medium heat until crisp, about 6 minutes. Drain on a paper towel.',
      'Toast the English muffin.',
      'Fry the egg in the same pan, breaking the yolk if you want it firm, about 3 minutes.',
      'Layer egg, cheddar and bacon on the muffin and close it up.',
    ],
    'b-chia-pudding': [
      'Stir the chia seeds, almond milk and maple syrup together in a jar.',
      'Wait 5 minutes, then stir again to break up clumps.',
      'Cover and refrigerate at least 4 hours or overnight.',
      'Top with berries before serving.',
    ],
    'b-sweet-potato-hash': [
      'Dice the sweet potato into small cubes.',
      'Stovetop: cook it in the oil over medium heat, covered, for 10 minutes, stirring now and then. Air fryer: toss with the oil and cook at 400°F for 12 minutes.',
      'Add the diced onion and bell pepper and cook 5 more minutes until browned.',
      'Make wells, crack in the eggs, cover and cook 4 to 5 minutes until the whites are set. (Air fryer: fry the eggs separately in a pan.)',
      'Season with salt and pepper and serve.',
    ],
    'b-green-smoothie-bowl': [
      'Use a frozen banana if you can for a thicker bowl.',
      'Blend the spinach, banana, almond butter and almond milk until thick and smooth.',
      'Pour into a bowl and sprinkle with chia seeds.',
    ],

    // Lunch
    'l-turkey-wrap': [
      'Lay the tortilla flat and spread the mustard over it.',
      'Layer on the greens, turkey, sliced tomato and sliced avocado.',
      'Fold in the sides, roll tightly and cut in half.',
    ],
    'l-chickpea-salad': [
      'Drain and rinse the chickpeas.',
      'Chop the cucumber, halve the cherry tomatoes and thinly slice the onion.',
      'Toss everything in a bowl with the olive oil, lemon juice, salt and pepper.',
      'Crumble the feta on top. It keeps well in the fridge for 3 days.',
    ],
    'l-tuna-lettuce-wraps': [
      'Drain the tuna and flake it into a bowl.',
      'Mix in the mayo, finely diced celery, lemon juice, salt and pepper.',
      'Spoon into large lettuce leaves and wrap.',
    ],
    'l-burrito-bowl': [
      'Cook the brown rice according to the package, about 25 minutes (or use a rice cooker).',
      'Season the chicken with salt, cumin and chili powder. Cook in a lightly oiled pan over medium-high heat 6 to 7 minutes per side, until 165°F inside.',
      'Warm the black beans.',
      'Slice the chicken and build bowls with rice, beans, chicken, cheddar and salsa.',
      'Finish with a squeeze of lime.',
    ],
    'l-lentil-soup': [
      'Rinse the lentils. Dice the onion, carrots and celery.',
      'Stovetop: soften the vegetables in a little oil for 5 minutes, then add the lentils, tomatoes, broth and spices. Simmer 30 minutes until the lentils are tender.',
      'Slow cooker: add everything and cook on low 6 to 8 hours. Instant Pot: pressure cook 12 minutes, then natural release 10.',
      'Season with salt, pepper and a squeeze of lemon if you have one.',
    ],
    'l-quinoa-bowl': [
      'Rinse the quinoa. Simmer with twice its volume of water, covered, for 15 minutes (Instant Pot: 1 minute high pressure, 10 minutes natural release).',
      'Drain and rinse the chickpeas. Chop the cucumber.',
      'Whisk the tahini with the lemon juice, a pinch of salt and a splash of water until pourable.',
      'Build the bowl with spinach, quinoa, chickpeas and cucumber, then drizzle with the dressing.',
    ],
    'l-quesadilla': [
      'Drain and rinse the black beans and mash them lightly with a fork.',
      'Spread the beans over one tortilla, sprinkle with cheddar and top with the second tortilla.',
      'Cook in a dry skillet over medium heat 2 to 3 minutes per side until crisp and the cheese melts.',
      'Cut into wedges and serve with salsa.',
    ],
    'l-egg-salad': [
      'Boil the eggs for 10 minutes (Instant Pot: 5 minutes high pressure, 5 natural release), then cool in cold water and peel.',
      'Chop the eggs and mix with the mayo, mustard, salt and pepper.',
      'Spread on the bread with the greens and close the sandwich.',
    ],
    'l-chicken-caesar': [
      'Season the chicken with salt, pepper and garlic powder.',
      'Cook it: pan 6 to 7 minutes per side, grill 5 to 6 per side, air fryer 375°F for 15 minutes, or oven 425°F for 20 minutes. It is done at 165°F.',
      'Whisk the Greek yogurt with the lemon juice, half the parmesan, salt and plenty of pepper to make the dressing.',
      'Toss the greens with the dressing, top with sliced chicken and the rest of the parmesan.',
    ],
    'l-hummus-pita': [
      'Warm the pita briefly if you like and cut it open.',
      'Spread the hummus inside.',
      'Fill with greens, sliced cucumber, sliced tomato and crumbled feta.',
    ],
    'l-turkey-chili': [
      'Brown the ground turkey with the diced onion and bell pepper in a pot over medium-high heat, about 8 minutes.',
      'Stir in the spices (chili powder, cumin, salt) for 30 seconds.',
      'Add the drained beans and canned tomatoes.',
      'Stovetop: simmer 20 minutes. Slow cooker: low 6 hours. Instant Pot: 10 minutes high pressure.',
      'Taste, adjust salt and serve. It freezes well.',
    ],
    'l-stuffed-sweet-potato': [
      'Prick the sweet potato all over with a fork.',
      'Microwave 6 to 8 minutes, turning halfway, until soft. Or bake at 400°F for 45 minutes.',
      'Warm the drained black beans.',
      'Split the potato open, fill with beans, and top with Greek yogurt and salsa.',
    ],
    'l-cobb-salad': [
      'Boil the egg for 10 minutes, cool in cold water, peel and chop.',
      'Cook the bacon until crisp and crumble it.',
      'Arrange the greens in a bowl and top with rows of egg, bacon, avocado, cherry tomatoes and sliced turkey.',
      'Dress with a little oil and vinegar, or your favorite dressing.',
    ],
    'l-tomato-soup-grilled-cheese': [
      'Simmer the canned tomatoes with a pinch of salt and pepper for 10 minutes.',
      'Stir in the milk, then blend until smooth (or mash well for a chunkier soup).',
      'Butter the outsides of the bread and fill with cheddar.',
      'Cook the sandwich in a pan over medium-low heat 3 minutes per side until golden and melty.',
      'Serve the sandwich with the soup for dipping.',
    ],
    'l-shrimp-avocado-salad': [
      'Thaw the shrimp under cold running water and pat dry.',
      'Cook in a hot pan with half the oil, salt and pepper for 1 to 2 minutes per side, until pink.',
      'Toss the greens and halved cherry tomatoes with the rest of the oil and the lime juice.',
      'Top with sliced avocado and the shrimp.',
    ],
    'l-tuna-pasta-salad': [
      'Cook the pasta in salted boiling water according to the package. Drain and rinse with cold water.',
      'Drain the tuna. Dice the cucumber and halve the cherry tomatoes.',
      'Toss the pasta with tuna, vegetables, olive oil, lemon juice, salt and pepper.',
      'Crumble the feta over the top. Serve cold.',
    ],
    'l-edamame-bowl': [
      'Cook the brown rice on the stove, in a rice cooker, or use microwave rice.',
      'Microwave the edamame 2 to 3 minutes or boil for 4 minutes.',
      'Shred or grate the carrot and slice the green onion.',
      'Build the bowl with rice, edamame, carrot and cabbage, then drizzle with soy sauce.',
    ],
    'l-chickpea-smash': [
      'Drain and rinse the chickpeas, then mash them roughly with a fork.',
      'Stir in the tahini, lemon juice, finely diced celery, salt and pepper.',
      'Spread on the bread with the greens and close the sandwich.',
    ],

    // Dinner
    'd-sheet-pan-chicken': [
      'Heat the oven to 425°F (or the air fryer to 400°F).',
      'Cut the chicken and sweet potato into bite-size pieces.',
      'Toss the chicken, sweet potato and broccoli with the oil and spices.',
      'Spread on a sheet pan and roast 20 to 25 minutes (air fryer 15 to 18, shaking halfway) until the chicken reaches 165°F.',
    ],
    'd-baked-salmon': [
      'Rinse the quinoa and simmer it in twice its volume of water for 15 minutes, covered (or Instant Pot 1 minute).',
      'Heat the oven to 400°F (or the air fryer to 390°F).',
      'Put the salmon and green beans on a tray, drizzle with oil, season with salt and pepper and top the salmon with lemon slices.',
      'Bake 12 to 15 minutes (air fryer 8 to 10) until the salmon flakes easily.',
      'Serve over the quinoa with a squeeze of lemon.',
    ],
    'd-turkey-tacos': [
      'Brown the ground turkey in a pan over medium-high heat, breaking it up, about 7 minutes.',
      'Add the spices (chili powder, cumin, garlic, salt) and a splash of water. Simmer 2 minutes.',
      'Toss the cabbage with lime juice and a pinch of salt.',
      'Warm the tortillas in a dry pan, then fill with turkey, slaw and salsa.',
    ],
    'd-spaghetti': [
      'Boil the pasta in salted water according to the package.',
      'Meanwhile, brown the ground beef with the diced onion in a pan, about 8 minutes. Drain any fat.',
      'Add the marinara and simmer 10 minutes.',
      'Toss with the drained pasta and top with parmesan.',
    ],
    'd-sweet-potato-chili': [
      'Dice the sweet potato, onion and bell pepper.',
      'Stovetop: soften the onion and pepper in a little oil for 5 minutes, then add everything else with 1 cup water and simmer 25 minutes until the sweet potato is tender.',
      'Slow cooker: everything in, low 6 to 7 hours. Instant Pot: 8 minutes high pressure.',
      'Season with salt and serve with any toppings you like.',
    ],
    'd-chicken-stir-fry': [
      'Cook the brown rice according to the package.',
      'Slice the chicken thin. Cut the bell pepper into strips and mince the garlic.',
      'Stir-fry the chicken in hot oil over high heat for 5 minutes, then set it aside.',
      'Stir-fry the broccoli and pepper for 3 to 4 minutes, add the garlic for 30 seconds, then return the chicken.',
      'Add the soy sauce, toss to coat and serve over rice.',
    ],
    'd-shrimp-zoodles': [
      'Spiralize the zucchini or cut it into thin ribbons with a peeler.',
      'Thaw the shrimp and cook in a hot pan with a little oil for 1 to 2 minutes per side until pink. Set aside.',
      'Add the zucchini noodles and halved cherry tomatoes to the pan for 2 minutes, just until warm.',
      'Turn off the heat, stir in the pesto and shrimp, and top with parmesan.',
    ],
    'd-steak-veggies': [
      'Pat the steak dry and season well with salt and pepper. Let it sit 15 minutes.',
      'Cook in a very hot skillet or on the grill 3 to 5 minutes per side for medium-rare (130°F). Rest 5 minutes.',
      'In the same pan, melt the butter with minced garlic and cook the mushrooms and green beans for 6 to 8 minutes.',
      'Slice the steak against the grain and serve with the vegetables.',
    ],
    'd-chicken-curry': [
      'Cut the chicken thighs into chunks and dice the onion.',
      'Slow cooker: add the chicken, onion, coconut milk, tomatoes and curry spices. Cook on low 6 hours.',
      'Instant Pot: sauté the onion, add everything else, pressure cook 10 minutes. Stovetop: brown the chicken and onion, add the rest and simmer 25 minutes.',
      'Cook the rice (stovetop or rice cooker) and serve the curry over it.',
    ],
    'd-lentil-dal': [
      'Rinse the lentils. Dice the onion and mince the garlic.',
      'Soften the onion and garlic in a little oil for 5 minutes, then add the spices (curry powder, cumin, turmeric) for 30 seconds.',
      'Add the lentils, tomatoes, coconut milk and 1 cup water per serving. Simmer 20 to 25 minutes until thick (Instant Pot 10 minutes; slow cooker low 6 hours).',
      'Stir in the spinach until wilted. Serve over rice.',
    ],
    'd-air-fryer-salmon': [
      'Season the salmon with salt, pepper and a little oil.',
      'Air fry at 390°F for 8 to 10 minutes, or bake at 400°F for 12 to 15, until it flakes.',
      'Meanwhile, cook the cauliflower rice and broccoli in the microwave (4 to 5 minutes) or in a pan with a little oil.',
      'Serve the salmon on the cauliflower rice with the broccoli and a squeeze of lemon.',
    ],
    'd-pork-chops': [
      'Season the pork chops with salt, pepper and the spices.',
      'Pan: sear in hot oil 4 to 5 minutes per side. Oven: 400°F for 18 to 20 minutes. Air fryer: 380°F for 12 minutes. Cook to 145°F.',
      'Sauté the apple slices in the pan juices for 3 to 4 minutes until soft.',
      'Steam or sauté the green beans for 5 minutes and serve everything together.',
    ],
    'd-fried-rice': [
      'Cook the rice ahead and chill it if you can. Day-old rice fries best.',
      'Scramble the eggs in a hot oiled pan, then set them aside.',
      'Add the frozen vegetables and cook 3 to 4 minutes.',
      'Add the rice and stir-fry 3 minutes until hot, then stir in the soy sauce and eggs.',
      'Top with sliced green onion.',
    ],
    'd-tofu-stir-fry': [
      'Cook the brown rice according to the package.',
      'Press the tofu for 10 minutes, then cut it into cubes.',
      'Fry the tofu in a hot oiled pan for 8 minutes until golden on several sides. Set aside.',
      'Stir-fry the broccoli and bell pepper 4 minutes, add the minced garlic, then return the tofu with the soy sauce.',
      'Serve over the rice.',
    ],
    'd-souvlaki': [
      'Cut the chicken into chunks and toss with half the oil, lemon juice, oregano, garlic, salt and pepper. Marinate at least 15 minutes.',
      'Cook on the grill or in a pan 10 to 12 minutes, turning, or in the oven at 425°F (air fryer 380°F) for 15 to 18 minutes.',
      'For the tzatziki, grate the cucumber, squeeze out the water and stir it into the Greek yogurt with a pinch of salt.',
      'Warm the pita and fill with chicken, sliced tomato and tzatziki.',
    ],
    'd-stuffed-peppers': [
      'Heat the oven to 375°F (or the air fryer to 350°F). Cook the rice on the stove or in the microwave.',
      'Brown the ground turkey in a pan (or microwave it in short bursts, stirring) until cooked through.',
      'Mix the turkey, rice and marinara. Cut the tops off the peppers and remove the seeds.',
      'Fill the peppers, top with mozzarella and bake 25 to 30 minutes (air fryer 15 to 18) until the peppers are tender.',
    ],
    'd-beef-broccoli': [
      'Slice the steak thinly against the grain.',
      'Sear the beef in a very hot oiled pan for 2 minutes, then set it aside.',
      'Stir-fry the broccoli with the minced garlic for 4 minutes, adding a splash of water to steam.',
      'Return the beef, add the soy sauce and toss for 1 minute.',
      'Cook the cauliflower rice in a pan or microwave for 4 minutes and serve underneath.',
    ],
    'd-baked-potato': [
      'Prick the potato all over with a fork.',
      'Microwave 7 to 10 minutes, turning halfway, until soft. Or bake at 400°F for 50 to 60 minutes (air fryer 400°F for 40 minutes).',
      'Steam the broccoli in the microwave or a pot for 3 to 4 minutes.',
      'Split the potato and top with broccoli, cheddar, Greek yogurt and sliced green onion.',
    ],
    'd-chickpea-sheet-pan': [
      'Heat the oven to 425°F (or the air fryer to 390°F).',
      'Drain the chickpeas and pat dry. Chop the zucchini, bell pepper and onion.',
      'Toss everything with the olive oil and spices (oregano, garlic powder, salt).',
      'Roast 25 minutes (air fryer 15, shaking halfway) until browned.',
      'Crumble the feta over the top while it is hot.',
    ],
    'd-pasta-primavera': [
      'Boil the pasta in salted water according to the package. Save a cup of the cooking water.',
      'Sauté the minced garlic in the olive oil for 30 seconds, then add the sliced zucchini and cook 4 minutes.',
      'Add the halved cherry tomatoes and spinach and cook 2 minutes more.',
      'Toss in the pasta with a splash of pasta water and the parmesan until glossy.',
    ],
    'd-bbq-chicken': [
      'Slow cooker: put the chicken in and pour the BBQ sauce over it. Cook on low 4 hours.',
      'Instant Pot: add the chicken, sauce and 1/4 cup water, pressure cook 12 minutes. Oven: bake covered at 375°F for 30 minutes.',
      'Shred the chicken with two forks and stir it into the sauce.',
      'For the slaw, mix the cabbage with the Greek yogurt, a pinch of salt and a splash of vinegar.',
      'Serve the chicken with the slaw.',
    ],
    'd-bean-burrito-bowl': [
      'Cook the rice in the microwave, on the stove or in a rice cooker.',
      'Microwave the frozen vegetables 3 to 4 minutes.',
      'Warm the drained black beans with a pinch of cumin and salt.',
      'Build the bowl with rice, beans and vegetables, then top with cheddar and salsa.',
    ],
    'd-mezze-plate': [
      'Drain and rinse the chickpeas and season with salt, pepper and a little olive oil.',
      'Cut the pita into wedges and slice the cucumber. Halve the cherry tomatoes.',
      'Arrange everything on a plate around a pile of hummus, and crumble the feta on the side.',
    ],
    'd-tuna-chickpea-salad': [
      'Drain the tuna and the chickpeas.',
      'Whisk the olive oil and lemon juice with salt and pepper. Slice the onion thinly.',
      'Toss the spinach, chickpeas, onion and tuna with the dressing.',
    ],
    'd-chicken-thighs-broccoli': [
      'Heat the oven to 425°F (or the air fryer to 380°F).',
      'Rub the chicken thighs with half the oil and the spices (paprika, garlic powder, salt).',
      'Toss the broccoli with the rest of the oil and a pinch of salt.',
      'Roast together 25 to 30 minutes (air fryer 18 to 20) until the chicken reaches 175°F and the edges are crisp.',
    ],
    'd-turkey-lettuce-tacos': [
      'Brown the ground turkey in a pan, breaking it up, about 7 minutes.',
      'Add the taco spices and a splash of water and simmer 2 minutes.',
      'Spoon into large lettuce leaves.',
      'Top with cheddar, diced avocado and salsa.',
    ],
    'd-salmon-spinach': [
      'Pat the salmon dry and season with salt and pepper.',
      'Melt half the butter in a pan over medium-high heat. Cook the salmon skin-side down 4 minutes, flip, and cook 3 to 4 more. Set aside.',
      'Melt the rest of the butter, add the minced garlic for 30 seconds, then the spinach until wilted.',
      'Serve the salmon on the spinach with a squeeze of lemon.',
    ],
    'd-bunless-burger': [
      'Shape the ground beef into a patty about 3/4 inch thick and season both sides with salt and pepper.',
      'Cook in a hot skillet or on the grill 4 minutes per side for medium (160°F for well done).',
      'Top with cheddar for the last minute so it melts.',
      'Serve on the greens with sliced tomato and mustard.',
    ],
    'd-black-bean-tacos': [
      'Warm the black beans with a pinch of cumin and salt, on the stove or in the microwave, and mash them lightly.',
      'Toss the cabbage with the lime juice and a pinch of salt.',
      'Warm the corn tortillas in a dry pan or the microwave wrapped in a damp towel.',
      'Fill with beans, slaw and sliced avocado, and top with salsa.',
    ],
    'd-chickpea-curry': [
      'Cook the rice (stovetop or Instant Pot).',
      'Soften the diced onion in a little oil for 5 minutes, then stir in the curry spices for 30 seconds.',
      'Add the drained chickpeas, canned tomatoes and coconut milk. Simmer 15 minutes (Instant Pot: 5 minutes high pressure).',
      'Stir in the spinach until wilted and serve over rice.',
    ],

    // Snacks
    's-apple-pb': ['Slice the apple and remove the core.', 'Serve with the peanut butter for dipping.'],
    's-hummus-veggies': ['Peel the carrots and cut the carrots and cucumber into sticks.', 'Serve with the hummus.'],
    's-yogurt-honey': ['Spoon the Greek yogurt into a bowl.', 'Drizzle with honey and add a pinch of cinnamon if you like.'],
    's-boiled-eggs': [
      'Boil the eggs for 10 minutes (Instant Pot: 5 minutes high pressure, 5 natural release).',
      'Cool them in cold water for 5 minutes, then peel.',
      'Sprinkle with salt, pepper or everything-bagel seasoning.',
    ],
    's-almonds': ['Portion about 1 ounce, roughly 23 almonds, into a small container so you don’t overeat.'],
    's-cottage-berries': ['Spoon the cottage cheese into a bowl.', 'Top with the thawed berries.'],
    's-roasted-chickpeas': [
      'Heat the oven to 400°F (or the air fryer to 390°F).',
      'Drain, rinse and dry the chickpeas very well with a towel.',
      'Toss with the oil and spices.',
      'Roast 25 to 30 minutes (air fryer 12 to 15, shaking twice) until crunchy. They crisp more as they cool.',
    ],
    's-popcorn': [
      'Stovetop: heat the oil with the kernels in a covered pot over medium-high heat, shaking often, until the popping slows.',
      'Microwave: put the kernels in a brown paper bag, fold the top twice and microwave 2 to 3 minutes until popping slows. Drizzle with the oil.',
      'Season with salt.',
    ],
    's-edamame': [
      'Microwave the edamame with a splash of water, covered, for 2 to 3 minutes, or boil for 4 minutes.',
      'Drain and sprinkle with salt or chili flakes.',
    ],
    's-protein-shake': ['Add the almond milk and protein powder to the blender.', 'Blend 20 seconds with a few ice cubes.'],
    's-turkey-rollups': ['Lay out the turkey slices.', 'Sprinkle with cheddar and roll each one up tightly.'],
    's-rice-cakes': ['Spread the almond butter over the rice cakes.', 'Top with a few banana slices or a pinch of cinnamon if you have them.'],
    's-chocolate-berries': ['Break the dark chocolate into squares.', 'Serve with the thawed berries.'],
    's-banana': ['Peel and enjoy.'],
    's-celery-pb': ['Wash the celery and cut it into sticks.', 'Fill the groove with peanut butter.'],
    's-energy-bites': [
      'Stir together the oats, peanut butter, honey, chia seeds and chopped dark chocolate.',
      'Chill 15 minutes so the mix firms up.',
      'Roll into small balls. They keep in the fridge for a week.',
    ],
    's-cheese-walnuts': ['Portion the cheddar and walnuts into a small bowl or container.'],

    // Ready-made: store-bought items with heating or serving steps. Times are typical; the box wins.
    'rb-yogurt-cup': ['Stir the yogurt cup and eat it cold.'],
    'rb-yogurt-cup-banana': ['Stir the yogurt cup.', 'Peel the banana and slice it on top, or eat it on the side.'],
    'rb-belvita': ['Open the pack. Each pack is one serving.'],
    'rb-belvita-shake': ['Shake the protein shake well and serve it cold.', 'Eat the belVita biscuits alongside.'],
    'rb-breakfast-sandwich': [
      'Microwave: unwrap, wrap in a paper towel and heat about 1½ to 2 minutes, flipping halfway.',
      'Oven or air fryer: bake at 350°F for about 20 minutes (air fryer about 10 minutes) until hot in the middle.',
      'Let it rest 1 minute before eating.',
    ],
    'rb-instant-oatmeal': [
      'Microwave: empty the packet into a bowl, add the water or milk the packet calls for, and heat 1 to 2 minutes.',
      'Stovetop: bring the liquid to a boil, stir in the oats and cook 1 minute.',
      'Stir and let it thicken for a minute.',
    ],
    'rb-waffles': [
      'Toast the frozen waffles on medium until crisp, or bake at 400°F for about 5 minutes (air fryer 360°F, 3 to 4 minutes).',
      'Spread with peanut butter while warm.',
    ],
    'rb-protein-shake': ['Shake the protein shake well and serve it cold.', 'Eat the banana alongside.'],

    'rl-hot-pocket': [
      'Microwave: unwrap, slide into the crisping sleeve and heat about 2 minutes (1 minute for a single in a high-power microwave).',
      'Oven or air fryer: bake at 350°F for about 25 minutes (air fryer about 12 minutes), no sleeve.',
      'Let it stand 2 minutes. The filling gets very hot.',
    ],
    'rl-hot-pocket-apple': [
      'Heat the Hot Pocket: microwave about 2 minutes in its sleeve, or bake at 350°F for about 25 minutes (air fryer about 12).',
      'Let it stand 2 minutes.',
      'Wash and slice the apple to eat on the side.',
    ],
    'rl-frozen-burrito': [
      'Microwave: wrap in a paper towel and heat about 1 minute, flip, then 1 more minute.',
      'Oven or air fryer: wrap in foil and bake at 350°F for about 25 minutes (air fryer about 12, unwrapped).',
      'Top with salsa.',
    ],
    'rl-frozen-meal': [
      'Cut a vent in the film and microwave as the box says, usually 4 to 5 minutes with a stir halfway.',
      'Let it stand 1 minute before eating.',
    ],
    'rl-soup-bowl': ['Peel back the lid to the vent line.', 'Microwave about 2 to 3 minutes, stir and let it stand 1 minute.'],
    'rl-deli-sandwich': ['Keep it refrigerated and eat it cold, by the date on the label.'],
    'rl-ramen-cup': [
      'Microwave: fill the cup with water to the line and heat about 3 minutes. Stovetop: boil the water, pour it in and cover 3 minutes.',
      'Stir in the seasoning.',
      'Top with half a hard-boiled egg.',
    ],
    'rl-mac-cup': [
      'Add water to the fill line and microwave about 3½ minutes.',
      'Stir in the cheese powder until smooth.',
      'Eat the string cheese on the side.',
    ],

    'rd-personal-pizza': [
      'Oven: bake at 400°F directly on the rack for 15 to 18 minutes, until the cheese bubbles.',
      'Air fryer: 375°F for about 8 to 10 minutes. Microwave: use the crisping tray if the box has one, about 3 minutes.',
      'Let it cool 2 minutes before slicing.',
    ],
    'rd-power-bowl': [
      'Cut a vent in the film and microwave about 3 minutes.',
      'Stir, then heat 1 to 2 minutes more until hot all the way through.',
    ],
    'rd-rotisserie': [
      'Carve a quarter of the rotisserie chicken (a breast and a wing, or a leg and thigh). Chill the rest for later meals.',
      'Toss a third of the salad kit with its dressing and toppings.',
      'Serve the chicken warm or cold beside the salad.',
    ],
    'rd-skillet-meal': [
      'Stovetop: empty the bag into a nonstick skillet over medium-high heat, cover and cook 8 to 10 minutes, stirring often.',
      'Microwave: empty into a microwave-safe dish, cover and heat 6 to 7 minutes, stirring halfway.',
      'Let it stand 1 minute before serving.',
    ],
    'rd-frozen-meal': [
      'Cut a vent in the film and microwave as the box says, usually 4 to 5 minutes with a stir halfway.',
      'Toss a quarter of the salad kit with its dressing and serve on the side.',
    ],

    'rs-uncrustables': ['Thaw in the fridge overnight, or on the counter for 30 to 60 minutes.', 'Eat within 8 hours of thawing.'],
    'rs-string-cheese': ['Unwrap two sticks and eat them cold.'],
    'rs-protein-bar': ['Unwrap and eat.'],
    'rs-granola-bar': ['Unwrap and eat.'],
    'rs-fruit-cup': ['Peel back the lid. Drain the juice first if you want fewer carbs.'],
    'rs-applesauce': ['Twist off the cap and squeeze. Chill it first if you like it cold.'],
    'rs-cheese-crackers': ['Open the pack and eat. One pack is one serving.'],
    'rs-jerky': ['Portion about 1 oz (a small handful) and reseal the bag.'],
    'rs-hummus-pretzels': ['Peel back the lid and dip the pretzels in the hummus. Keep refrigerated.'],
    'rs-trail-mix': ['Open the pack. Each one is a single serving.'],
    'rs-egg-pack': ['Peel back the film. Sprinkle with salt and pepper if you like.'],
    'rs-yogurt-cup': ['Stir the yogurt cup and eat it cold.'],

    // Everyday grab-and-go
    'rb-pop-tarts': ['Eat them straight from the pack, or toast on the lowest setting for a warm one.'],
    'rb-cereal': ['Pour about 1½ cups of cereal into a bowl.', 'Add a cup of cold milk.'],
    'rb-donuts': ['Grab two and enjoy. Warm for 8 seconds in the microwave if you like them soft.'],
    'rb-muffin': ['Eat as is, or warm for 15 seconds in the microwave.'],
    'rb-bagel': ['Slice the bagel and toast it if you have a toaster.', 'Spread with cream cheese.'],
    'rb-breakfast-burrito': [
      'Microwave: wrap in a paper towel and heat about 1 minute per side.',
      'Oven or air fryer: bake at 375°F for about 20 minutes (air fryer about 10) until hot in the middle.',
      'Let it rest 1 minute.',
    ],
    'rb-pancakes': [
      'Microwave three pancakes on a plate for about 1 minute, or toast them like waffles.',
      'Oven: 375°F for about 8 minutes.',
      'Pour on the syrup.',
    ],
    'rb-sausage-biscuit': [
      'Microwave: wrap in a paper towel and heat about 1 minute, flipping halfway.',
      'Oven or air fryer: 350°F for about 15 minutes (air fryer about 8).',
    ],

    'rl-lunchables': ['Open the tray and stack the crackers, meat and cheese.'],
    'rl-pasta-cup': ['Peel back the lid a little.', 'Microwave about 1 minute, stir and let it stand 1 minute.'],
    'rl-canned-soup': [
      'Microwave: pour into a bowl, cover and heat 2½ to 3 minutes, stirring halfway.',
      'Stovetop: heat in a small pot over medium, stirring, for about 5 minutes.',
    ],
    'rl-nuggets': [
      'Air fryer: 400°F for 8 to 10 minutes, shaking once. Oven: 400°F for about 15 minutes.',
      'Microwave: about 1½ minutes for 6 nuggets (softer, not crispy).',
      'Dip in BBQ sauce.',
    ],
    'rl-corn-dogs': [
      'Microwave: about 50 seconds each, flipping halfway.',
      'Oven or air fryer: 375°F for about 18 minutes (air fryer about 10) for a crispier outside.',
    ],
    'rl-pizza-rolls': [
      'Air fryer: 380°F for 6 to 8 minutes, shaking once. Oven: 425°F for about 12 minutes.',
      'Microwave: spread on a plate and heat about 1 minute.',
      'Let them cool a minute. The filling gets very hot.',
    ],
    'rl-taquitos': [
      'Air fryer: 400°F for 7 to 9 minutes. Oven: 425°F for about 15 minutes.',
      'Microwave: about 1½ minutes for 4 (softer).',
      'Serve with salsa for dipping.',
    ],
    'rl-sliders': ['Take the patty out of the bun, wrap the bun in a paper towel.', 'Microwave together about 1 minute, then reassemble.'],

    'rd-lasagna': [
      'Microwave: cut a vent in the film and heat about 6 minutes, then let it stand 1 minute.',
      'Oven: 375°F for about 45 minutes, covered.',
    ],
    'rd-frozen-pizza': ['Heat the oven to the temperature on the box, usually 400 to 425°F.', 'Bake directly on the rack for 18 to 22 minutes.', 'Cut into slices. A third of the pizza is one serving.'],
    'rd-pot-pie': [
      'Microwave: cut slits in the crust and heat about 7 to 9 minutes.',
      'Oven: bake on a baking sheet at 400°F for about 50 minutes for a crispy crust.',
      'Let it stand 5 minutes. The filling is very hot.',
    ],
    'rd-fish-sticks': [
      'Air fryer: cook the fries at 400°F for about 10 minutes, then add the fish sticks for 8 more.',
      'Oven: bake fries and fish sticks on a sheet pan at 425°F for about 18 minutes, flipping once.',
      'Serve with ketchup or tartar sauce.',
    ],
    'rd-chicken-tenders': [
      'Air fryer: cook the fries at 400°F for about 10 minutes, then add the tenders for 10 more.',
      'Oven: bake both on a sheet pan at 425°F for about 20 minutes, flipping once.',
      'Serve with BBQ sauce.',
    ],
    'rd-orange-chicken': [
      'Heat the chicken: air fryer 400°F for about 10 minutes, or microwave as the bag says (about 3 minutes), or pan-fry 8 minutes.',
      'Warm the sauce packet in hot water or the microwave and toss with the chicken.',
      'Microwave the rice cup about 1 minute and serve together.',
    ],
    'rd-tv-dinner': ['Cut a vent in the film over each section.', 'Microwave as the box says, usually 5 to 7 minutes, stirring the sides halfway.', 'Let it stand 1 minute.'],
    'rd-chili-chips': [
      'Heat half a can of chili in the microwave (about 2 minutes, covered) or in a small pot.',
      'Pour over a handful of corn chips. Save the rest of the can in the fridge.',
    ],
    'rd-mac-hotdogs': [
      'Boil the macaroni from the box for 7 to 8 minutes, then drain.',
      'Stir in the cheese packet, a splash of milk and a little butter.',
      'Slice the hot dogs and warm them in the pot, or microwave them for 30 seconds, then stir in.',
    ],

    'rs-chips': ['Open the bag and enjoy.'],
    'rs-goldfish': ['Open the pack and enjoy.'],
    'rs-cookies': ['Open the pack and enjoy. Milk optional.'],
    'rs-popcorn': ['Open the bag and enjoy.'],
    'rs-candy-bar': ['Unwrap and enjoy.'],
    'rs-pudding': ['Peel back the lid. Best cold.'],
    'rs-krispies': ['Unwrap and enjoy.'],
    'rs-snack-cake': ['Unwrap and enjoy.'],
    'rs-cheese-puffs': ['Open the bag and enjoy.'],
    'rs-ice-cream-sandwich': ['Keep frozen until you eat it. Unwrap and enjoy.'],
    'rs-pretzels': ['Open the bag and enjoy.'],
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = STEPS;
  } else {
    root.MPSteps = STEPS;
  }
})(typeof self !== 'undefined' ? self : this);
